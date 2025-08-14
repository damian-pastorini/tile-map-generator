/**
 *
 * Reldens - Tile Map Generator - PathConnector
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PathConnector
{

    constructor(generator)
    {
        this.generateElementsPath = generator.generateElementsPath;
        this.mainPathSize = generator.mainPathSize;
        this.previousMainPath = generator.previousMainPath;
        this.pathSize = generator.pathSize;
        this.isBorderWalkable = generator.isBorderWalkable;
        this.pathTile = generator.pathTile;
        this.blockMapBorder = generator.blockMapBorder;
        this.sortPositionsRelativeToTheMapCenter = generator.sortPositionsRelativeToTheMapCenter;
        this.applySurroundingPathTiles = generator.applySurroundingPathTiles;
        this.splitBordersInLayers = generator.splitBordersInLayers;
        this.applyPathsInnerWalls = generator.applyPathsInnerWalls;
        this.pathsInnerWallsTilesKey = generator.pathsInnerWallsTilesKey;
        this.applyPathsOuterWalls = generator.applyPathsOuterWalls;
        this.pathsOuterWallsTilesKey = generator.pathsOuterWallsTilesKey;
        this.cleanPathBorderTilesFromElements = generator.cleanPathBorderTilesFromElements;
        this.allowPlacePathOverElementsFreeArea = generator.allowPlacePathOverElementsFreeArea;
        this.collisionLayersForPaths = generator.collisionLayersForPaths;
        this.mapName = generator.mapName;
        this.pathFinder = generator.pathFinder;
        this.mapGridBuilder = generator.mapGridBuilder;
        this.tileIndexByRowAndColumn = generator.tileIndexByRowAndColumn.bind(generator);
        this.replaceSequences = generator.replaceSequences.bind(generator);
        this.replaceSequence = generator.replaceSequence.bind(generator);
        this.rotateLayer90Degrees = generator.rotateLayer90Degrees.bind(generator);
        this.rollbackRotation90Degrees = generator.rollbackRotation90Degrees.bind(generator);
        this.connectedTiles = generator.connectedTiles.bind(generator);
        this.countConnected = generator.countConnected.bind(generator);
        this.fetchValueForX = generator.fetchValueForX.bind(generator);
        this.fetchValueForY = generator.fetchValueForY.bind(generator);
        this.provideReturnIndexByPosition = generator.provideReturnIndexByPosition.bind(generator);
        this.isBorder = generator.isBorder.bind(generator);
        this.createLayerInnerWalls = generator.createLayerInnerWalls.bind(generator);
        this.createLayerOuterWalls = generator.createLayerOuterWalls.bind(generator);
        this.fixInnerWallsPatterns = generator.fixInnerWallsPatterns.bind(generator);
        this.mapTilesShortcuts = generator.mapTilesShortcuts.bind(generator);
        this.applySplitBordersAndCorners = generator.spotGenerator.applySplitBordersAndCorners.bind(
            generator.spotGenerator
        );
        this.applyBorderEndTiles = generator.spotGenerator.applyBorderEndTiles.bind(generator.spotGenerator);
    }

    async connectPaths(
        mapWidth,
        mapHeight,
        temporalBlockedPositionsToAvoidElements,
        additionalLayers,
        mapGrid,
        pathLayerData,
        splitBorderLayer,
        mainPathStart,
        pathInnerWallsLayer,
        pathOuterWallsLayer,
        tilesShortcuts
    ){
        if(!this.generateElementsPath){
            return false;
        }
        let gridResult = this.mapGridBuilder.createPathfindingGrid(
            this.pathFinder,
            mapWidth,
            mapHeight,
            temporalBlockedPositionsToAvoidElements,
            additionalLayers,
            this.collisionLayersForPaths,
            mapGrid,
            this.tileIndexByRowAndColumn
        );
        let grid = gridResult.grid;
        let debugLayerData = gridResult.debugLayerData;
        let allPathsPoints = [];
        let pathLayers = additionalLayers.filter(layer => 'path' === layer.name);
        if(mainPathStart){
            grid.setWalkableAt(mainPathStart.x, mainPathStart.y, true);
        }
        for(let layer of pathLayers){
            let pathTilePositions = this.sortPositionsByDistanceFromCenter(
                this.findPathTilePositions(layer.data, mapWidth, mapHeight),
                mapWidth,
                mapHeight
            );
            for(let i = 0; i < pathTilePositions.length; i++){
                let pathTilePosition = pathTilePositions[i];
                if(this.isBorder(pathTilePosition)){
                    continue;
                }
                grid.setWalkableAt(pathTilePosition.x, pathTilePosition.y, true);
                let endPathTilePosition = this.fetchEndPathTilePosition(
                    pathTilePositions,
                    pathTilePosition,
                    mainPathStart
                );
                let path = this.findPathToPoints(pathTilePosition, endPathTilePosition, pathTilePositions, grid);
                if(0 === path.length){
                    continue;
                }
                for(let point of path){
                    grid.setWalkableAt(point[0], point[1], true);
                    let pointIndex = point[1] * mapWidth + point[0];
                    pathLayerData[pointIndex] = this.pathTile;
                    allPathsPoints.push(point);
                }
            }
        }
        if(1 < this.pathSize){
            pathLayerData = this.expandPaths(pathLayerData, mapWidth, mapHeight, additionalLayers, mapGrid);
        }
        for(let point of allPathsPoints){
            mapGrid[point[1]][point[0]] = false;
        }
        if(!this.applySurroundingPathTiles){
            this.markPathTilesAsUnavailable(splitBorderLayer, pathLayerData, mapGrid, mapWidth, mapHeight);
            return {pathLayerData, debugLayerData, splitBorderLayer, pathInnerWallsLayer, pathOuterWallsLayer};
        }
        splitBorderLayer = this.applySplitBordersAndCorners(
            this.applySurroundingPathTiles,
            mapWidth,
            mapHeight,
            this.splitBordersInLayers,
            pathLayerData,
            tilesShortcuts
        );
        splitBorderLayer = this.applyCleanPathBorderTiles(splitBorderLayer, mapWidth, mapHeight, additionalLayers);
        splitBorderLayer = this.applyBorderEndTiles(
            splitBorderLayer,
            this.fetchPathBorderEndTiles(splitBorderLayer, mapWidth),
            splitBorderLayer,
            tilesShortcuts,
            mapWidth,
            mapHeight
        );
        pathInnerWallsLayer = this.createPathInnerWalls(splitBorderLayer, mapWidth, mapHeight, tilesShortcuts);
        let outerWallsResult = await this.createPathOuterWalls(
            splitBorderLayer,
            mapWidth,
            mapHeight,
            pathInnerWallsLayer,
            tilesShortcuts
        );
        if(outerWallsResult?.outerWallsLayer && outerWallsResult?.bordersLayer){
            pathOuterWallsLayer = outerWallsResult.outerWallsLayer;
            splitBorderLayer = outerWallsResult.bordersLayer;
            pathInnerWallsLayer = this.fixInnerWallsPatterns(
                pathInnerWallsLayer,
                this.mapTilesShortcuts(this.pathsInnerWallsTilesKey, tilesShortcuts.p, null, '-inner-walls'),
                mapWidth,
                mapHeight
            );
        }
        splitBorderLayer = this.cleanUpMapBorders(splitBorderLayer, tilesShortcuts, mapWidth, mapHeight);
        this.markPathTilesAsUnavailable(splitBorderLayer, pathLayerData, mapGrid, mapWidth, mapHeight);
        pathLayerData = this.fillPathSingleTiles(pathLayerData, this.pathTile, mapWidth, mapHeight);
        if(!this.splitBordersInLayers){
            pathLayerData = splitBorderLayer;
        }
        return {pathLayerData, debugLayerData, splitBorderLayer, pathInnerWallsLayer, pathOuterWallsLayer};
    }

    placeMainPath(
        pathLayerData,
        mapGrid,
        mapWidth,
        mapHeight,
        generatedMainPathIndexes,
        generatedMainPathIndexesBorder,
        generatedReturnPoints,
        pathLayerProperties,
        hasAssociatedMap,
        mainPathStart
    ){
        if(0 < this.previousMainPath.length){
            let oppositeResult = this.generateOppositeMainPath(
                this.previousMainPath,
                mapWidth,
                mapHeight
            );
            generatedMainPathIndexes = oppositeResult.generatedMainPathIndexes;
            hasAssociatedMap = oppositeResult.hasAssociatedMap;
        }
        if(0 === generatedMainPathIndexes.length){
            let randomResult = this.generateRandomMainPath(mapWidth, mapHeight);
            mainPathStart = randomResult.mainPathStart;
            generatedMainPathIndexes = randomResult.generatedMainPathIndexes;
            if(randomResult.mainPathStartBorder){
                generatedMainPathIndexesBorder = randomResult.generatedMainPathIndexesBorder;
            }
        }
        if(0 < generatedMainPathIndexes.length){
            for(let mainPathPoint of generatedMainPathIndexes){
                let {index, y, x} = mainPathPoint;
                let result = this.placeMainPathIndex(index, y, x, pathLayerData, mapGrid, mapWidth);
                if(!result){
                    return {
                        pathLayerData,
                        generatedMainPathIndexes,
                        generatedMainPathIndexesBorder,
                        generatedReturnPoints,
                        pathLayerProperties,
                        hasAssociatedMap,
                        mainPathStart
                    };
                }
            }
            if(!generatedReturnPoints['default-main-path']){
                let {returnPointX, returnPointY, position} = this.determineReturnPointFromMainPath(
                    generatedMainPathIndexes,
                    mapWidth,
                    mapHeight
                );
                let returnPointIndex = this.provideReturnIndexByPosition(returnPointX, returnPointY);
                generatedReturnPoints['default-main-path'] = {
                    mapIndex: returnPointIndex,
                    x: returnPointX,
                    y: returnPointY,
                    position
                };
                let prefix = 'return-point-';
                let pointName = this.mapName;
                let type = 'int';
                pathLayerProperties.push(
                    {name: prefix+'for-default-'+pointName, type, value: returnPointIndex},
                    {name: prefix+'x-'+pointName, type, value: returnPointX},
                    {name: prefix+'y-'+pointName, type, value: returnPointY},
                    {name: prefix+'position-'+pointName, type: 'string', value: position}
                );
            }
        }
        if(0 < generatedMainPathIndexesBorder.length){
            Logger.debug('Main path tiles.', generatedMainPathIndexesBorder, generatedMainPathIndexes);
            for(let mainPathPointBorder of generatedMainPathIndexesBorder){
                pathLayerData[mainPathPointBorder.index] = this.pathTile;
            }
        }
        return {
            pathLayerData,
            generatedMainPathIndexes,
            generatedMainPathIndexesBorder,
            generatedReturnPoints,
            pathLayerProperties,
            hasAssociatedMap,
            mainPathStart
        };
    }

    determineReturnPointFromMainPath(generatedMainPathIndexes, mapWidth, mapHeight)
    {
        let position = 'down';
        let path = generatedMainPathIndexes[1] || generatedMainPathIndexes[0];
        if(!path){
            Logger.warning('Could not determine return point from main path.', generatedMainPathIndexes);
            return {returnPointX: 1, returnPointY: 1, position};
        }
        if(!this.blockMapBorder){
            return {returnPointX: path.x, returnPointY: path.y, position};
        }
        let returnPointX = 0 === path.x ? path.x + 1 : path.x;
        if(path.x === mapWidth - 1){
            returnPointX = mapWidth - 2;
        }
        let returnPointY = 0 === path.y ? path.x + 1 : path.y;
        if(path.y === mapHeight - 1){
            returnPointY = mapHeight - 2;
            position = 'up';
        }
        return {returnPointX, returnPointY, position};
    }

    generateRandomMainPath(mapWidth, mapHeight)
    {
        if(0 === this.mainPathSize){
            return {
                mainPathStart: null,
                generatedMainPathIndexes: [],
                mainPathStartBorder: null,
                generatedMainPathIndexesBorder: []
            };
        }
        let randomEdge = Math.floor(Math.random() * 4);
        let randomStartX = Math.floor(Math.random() * (mapWidth - this.mainPathSize));
        let randomStartY = Math.floor(Math.random() * (mapHeight - this.mainPathSize));
        let borderPathData = this.generateFullMainPathWithIndexes(
            0,
            randomEdge,
            randomStartX,
            randomStartY,
            mapWidth,
            mapHeight
        );
        if(this.isBorderWalkable){
            return {
                mainPathStart: borderPathData.mainPathStart,
                generatedMainPathIndexes: borderPathData.generatedPathIndexes,
                mainPathStartBorder: null,
                generatedMainPathIndexesBorder: []
            };
        }
        let notWalkableBorderPathData = this.generateFullMainPathWithIndexes(
            1,
            randomEdge,
            randomStartX,
            randomStartY,
            mapWidth,
            mapHeight
        );
        return {
            mainPathStart: notWalkableBorderPathData.mainPathStart,
            generatedMainPathIndexes: notWalkableBorderPathData.generatedPathIndexes,
            mainPathStartBorder: borderPathData.mainPathStart,
            generatedMainPathIndexesBorder: borderPathData.generatedPathIndexes
        };
    }

    generateOppositeMainPath(previousMainPath, mapWidth, mapHeight)
    {
        let previousPathMiddleTile = Math.ceil(previousMainPath.length / 2);
        let referenceY = previousMainPath[previousPathMiddleTile].y;
        let shouldFlipVertically = 0 === referenceY || mapHeight - 1 === referenceY;
        let generatedMainPathIndexes = [];
        for(let i = 0; i < previousMainPath.length; i++){
            let x = previousMainPath[i].x;
            if(!shouldFlipVertically){
                x = 0 === x ? mapWidth - 1 : 0;
            }
            let y = previousMainPath[i].y;
            if(shouldFlipVertically){
                y = 0 === y ? mapHeight - 1 : 0;
            }
            let index = y * mapWidth + x;
            generatedMainPathIndexes.push({index, x, y});
        }
        return {generatedMainPathIndexes, hasAssociatedMap: true};
    }

    generateFullMainPathWithIndexes(walkableBorder, randomEdge, randomStartX, randomStartY, mapWidth, mapHeight)
    {
        let firstWalkable = 0 + walkableBorder;
        let mainPathStart = {x: firstWalkable, y: firstWalkable};
        let lastWalkable = 1 + walkableBorder;
        switch(randomEdge){
            case 0:
                mainPathStart.x = randomStartX;
                mainPathStart.y = firstWalkable;
                break;
            case 1:
                mainPathStart.x = mapWidth - lastWalkable;
                mainPathStart.y = randomStartY;
                break;
            case 2:
                mainPathStart.x = randomStartX;
                mainPathStart.y = mapHeight - lastWalkable;
                break;
            case 3:
                mainPathStart.x = firstWalkable;
                mainPathStart.y = randomStartY;
                break;
        }
        let generatedPathIndexes = [];
        for(let i = 0; i < this.mainPathSize; i++){
            let x = mainPathStart.x;
            let y = mainPathStart.y;
            let plusOnX = firstWalkable === mainPathStart.y || mainPathStart.y === mapHeight - lastWalkable;
            x += (plusOnX ? i : 0);
            y += (plusOnX ? 0 : i);
            let index = y * mapWidth + x;
            let mainPathIndexData = {index, x, y};
            generatedPathIndexes.push(mainPathIndexData);
        }
        return {mainPathStart, generatedPathIndexes};
    }

    placeMainPathIndex(index, y, x, pathLayerData, mapGrid, mapWidth)
    {
        try {
            pathLayerData[index] = this.pathTile;
            this.mapGridBuilder.markMapGridPosition(mapGrid, y, x, false);
        } catch (error) {
            Logger.critical('Could not place main path tile.', index, y, x, error);
            return false;
        }
        return true;
    }

    expandPaths(pathLayerData, mapWidth, mapHeight, additionalLayers, mapGrid)
    {
        let directions = [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0]
        ];
        for(let level = 1; level < this.pathSize; level++){
            let tempPathLayerData = [...pathLayerData];
            for(let y = 0; y < mapHeight; y++){
                for(let x = 0; x < mapWidth; x++){
                    let pointIndex = y * mapWidth + x;
                    if(this.pathTile !== pathLayerData[pointIndex]){
                        continue;
                    }
                    for(let direction of directions){
                        let dx = direction[0];
                        let dy = direction[1];
                        let newX = x + dx;
                        let newY = y + dy;
                        if(0 <= newX && mapWidth > newX && 0 <= newY && mapHeight > newY){
                            let newPointIndex = newY * mapWidth + newX;
                            if(
                                mapGrid[newY][newX]
                                && this.pathTile !== pathLayerData[newPointIndex]
                                && !this.mapGridBuilder.isOccupiedByAnotherCollision(
                                    newX,
                                    newY,
                                    additionalLayers,
                                    additionalLayers,
                                    this.tileIndexByRowAndColumn
                                )
                            ){
                                tempPathLayerData[newPointIndex] = this.pathTile;
                            }
                        }
                    }
                }
            }
            pathLayerData = tempPathLayerData;
        }
        return pathLayerData;
    }

    markPathTilesAsUnavailable(splitBorderLayer, pathLayerData, mapGrid, mapWidth, mapHeight)
    {
        let pathFullLayerData = this.splitBordersInLayers ? splitBorderLayer : pathLayerData;
        for(let y = 0; y < mapHeight; y++){
            for(let x = 0; x < mapWidth; x++){
                let pointIndex = y * mapWidth + x;
                if(0 !== pathFullLayerData[pointIndex]){
                    mapGrid[y][x] = false;
                }
            }
        }
    }

    findPathToPoints(pathTilePosition, endPathTilePosition, pathTilePositions, grid)
    {
        let path = this.pathFinder.findPath(pathTilePosition, endPathTilePosition, grid);
        if(0 < path.length){
            Logger.debug('Path found for "endPathTilePosition".', {
                pathTilePosition: pathTilePosition ? grid.isWalkableAt(pathTilePosition.x, pathTilePosition.y) : false,
                walkableEndPathTilePosition: endPathTilePosition
                    ? grid.isWalkableAt(endPathTilePosition.x, endPathTilePosition.y)
                    : false
            });
            return path;
        }
        if(0 === path.length){
            Logger.debug('Path not found, retrying over "pathTilePositions".');
            let filteredPositions = pathTilePositions.filter(position => position !== pathTilePosition);
            for(let differentPathTilePosition of filteredPositions){
                path = this.pathFinder.findPath(pathTilePosition, differentPathTilePosition, grid);
                Logger.debug('Retrying position.', {
                    pathTilePosition,
                    walkablePathTilePosition: grid.isWalkableAt(pathTilePosition.x, pathTilePosition.y),
                    differentPathTilePosition,
                    walkablePoint: grid.isWalkableAt(differentPathTilePosition.x, differentPathTilePosition.y),
                    path
                });
                if(0 < path.length){
                    Logger.debug('Path found after retry on position.', differentPathTilePosition);
                    return path;
                }
            }
        }
        Logger.warning('Path not found, check walkable points.');
        return path;
    }

    fetchEndPathTilePosition(pathTilePositions, pathTilePosition, mainPathStart)
    {
        if(mainPathStart){
            return mainPathStart
        }
        if(sc.isArray(pathTilePositions)){
            return pathTilePositions[0];
        }
        return pathTilePosition;
    }

    sortPositionsByDistanceFromCenter(positions, mapWidth, mapHeight)
    {
        if(!this.sortPositionsRelativeToTheMapCenter){
            return positions;
        }
        let centerX = Math.floor(mapWidth / 2);
        let centerY = Math.floor(mapHeight / 2);
        let positionsWithDistance = [];
        for(let i = 0; i < positions.length; i++){
            let position = positions[i];
            let dx = position.x - centerX;
            let dy = position.y - centerY;
            let distance = Math.sqrt(dx * dx + dy * dy);
            positionsWithDistance.push({
                position: position,
                distance: distance
            });
        }
        positionsWithDistance.sort(function(a, b){
            return a.distance - b.distance;
        });
        let sortedPositions = [];
        for(let i = 0; i < positionsWithDistance.length; i++){
            sortedPositions.push(positionsWithDistance[i].position);
        }
        return sortedPositions;
    }

    findPathTilePositions(layerData, width, height)
    {
        let tilesFound = []
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let index = y * width + x;
                if(layerData[index] === this.pathTile){
                    tilesFound.push({ x, y });
                }
            }
        }
        return tilesFound;
    }

    fillPathSingleTiles(pathLayerData, pathTile, mapWidth, mapHeight)
    {
        let singleEmpty = [pathTile, 0, pathTile];
        let singleFix = [pathTile, pathTile, pathTile];
        let doubleEmpty = [pathTile, 0, 0, pathTile];
        let doubleFix = [pathTile, pathTile, pathTile, pathTile];
        this.replaceSequences(pathLayerData, [[singleEmpty, singleFix], [doubleEmpty, doubleFix]], mapWidth);
        pathLayerData = this.rotateLayer90Degrees(pathLayerData, mapWidth, mapHeight);
        this.replaceSequences(pathLayerData, [[singleEmpty, singleFix], [doubleEmpty, doubleFix]], mapHeight);
        pathLayerData = this.rollbackRotation90Degrees(pathLayerData, mapHeight, mapWidth);
        return pathLayerData;
    }

    applyCleanPathBorderTiles(splitBorderLayer, mapWidth, mapHeight, additionalLayers)
    {
        if(!this.cleanPathBorderTilesFromElements){
            return splitBorderLayer;
        }
        for(let y = 0; y < mapHeight; y++){
            for(let x = 0; x < mapWidth; x++){
                let index = y * mapWidth + x;
                if(this.pathTile !== splitBorderLayer[index]
                    && this.mapGridBuilder.isOccupiedByAnotherCollision(
                        x,
                        y,
                        additionalLayers,
                        additionalLayers,
                        this.tileIndexByRowAndColumn
                    )
                ){
                    splitBorderLayer[index] = 0;
                }
            }
        }
        return splitBorderLayer;
    }

    createPathInnerWalls(splitBorderLayer, mapWidth, mapHeight, tilesShortcuts)
    {
        if(!this.applyPathsInnerWalls){
            return false;
        }
        return this.createLayerInnerWalls(
            splitBorderLayer,
            this.pathsInnerWallsTilesKey,
            tilesShortcuts,
            mapWidth,
            mapHeight
        );
    }

    async createPathOuterWalls(
        splitBorderLayer,
        mapWidth,
        mapHeight,
        pathInnerWallsLayer,
        tilesShortcuts
    ){
        if(!this.applyPathsOuterWalls){
            return false;
        }
        return await this.createLayerOuterWalls(
            splitBorderLayer,
            this.pathsOuterWallsTilesKey,
            tilesShortcuts,
            mapWidth,
            mapHeight,
            pathInnerWallsLayer
        );
    }

    fetchPathBorderEndTiles(splitBorderLayer, mapWidth)
    {
        let pathBorderEndTiles = [];
        for(let tileIndex = 0; tileIndex < splitBorderLayer.length; tileIndex++){
            let tileConnections = this.connectedTiles(tileIndex, splitBorderLayer, mapWidth);
            let tileConnectionsCount = this.countConnected(tileConnections);
            let singleConnection = 1 === tileConnectionsCount.total;
            if(singleConnection){
                pathBorderEndTiles.push(tileIndex);
            }
        }
        return pathBorderEndTiles;
    }

    applyRotationToCompletePathGrid(pathTile, layerData, mapWidth, mapHeight)
    {
        let singleSpace = [pathTile, 0, pathTile];
        let singleReplace = [pathTile, pathTile, pathTile];
        let doubleSpace = [pathTile, 0, 0, pathTile];
        let doubleReplace = [pathTile, pathTile, pathTile, pathTile];
        while(true){
            this.replaceSequence(layerData, doubleSpace, doubleReplace, mapWidth);
            let applyHorizontalChanges = this.replaceSequence(layerData, singleSpace, singleReplace, mapWidth);
            layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
            this.replaceSequence(layerData, doubleSpace, doubleReplace, mapHeight);
            let applyVerticalChanges = this.replaceSequence(layerData, singleSpace, singleReplace, mapHeight);
            layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
            if(!applyHorizontalChanges && !applyVerticalChanges){
                break;
            }
        }
        return layerData;
    }

    cleanUpMapBorders(bordersLayer, tilesShortcuts, mapWidth, mapHeight)
    {
        let {sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR} = tilesShortcuts;
        let rowTopInvalidValues = [sBL, sBC, sBR];
        let rowBottomInvalidValues = [sTL, sTC, sTR];
        let rowLeftInvalidValue = [sTR, sMR, sBR];
        let rowRightInvalidValue = [sTL, sML, sBL];
        for(let c = 0; c < mapWidth; c++){
            let currentTopValue = bordersLayer[this.tileIndexByRowAndColumn(0, c)];
            if(-1 !== rowTopInvalidValues.indexOf(currentTopValue)){
                bordersLayer[this.tileIndexByRowAndColumn(0, c)] = 0;
            }
            let currentBottomValue = bordersLayer[this.tileIndexByRowAndColumn(mapHeight - 1, c)];
            if(-1 !== rowBottomInvalidValues.indexOf(currentBottomValue)){
                bordersLayer[this.tileIndexByRowAndColumn(mapHeight - 1, c)] = 0;
            }
        }
        for(let r = 0; r < mapHeight; r++){
            let currentLeftValue = bordersLayer[this.tileIndexByRowAndColumn(r, 0)];
            if(-1 !== rowLeftInvalidValue.indexOf(currentLeftValue)){
                bordersLayer[this.tileIndexByRowAndColumn(r, 0)] = 0;
            }
            let currentRightValue = bordersLayer[this.tileIndexByRowAndColumn(r, mapWidth - 1)];
            if(-1 !== rowRightInvalidValue.indexOf(currentRightValue)){
                bordersLayer[this.tileIndexByRowAndColumn(r, mapWidth - 1)] = 0;
            }
        }
        return bordersLayer;
    }

}

module.exports.PathConnector = PathConnector;
