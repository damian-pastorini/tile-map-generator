/**
 *
 * Reldens - Tile Map Generator - PathTilesFinisher
 *
 */

class PathTilesFinisher
{

    constructor(
        bordersPatterns,
        layerDataFactory,
        mapGridBuilder,
        wallsGenerator,
        geometryCalculator,
        tilePositionCalculator
    ){
        this.bordersPatterns = bordersPatterns;
        this.layerDataFactory = layerDataFactory;
        this.mapGridBuilder = mapGridBuilder;
        this.wallsGenerator = wallsGenerator;
        this.geometryCalculator = geometryCalculator;
        this.tilePositionCalculator = tilePositionCalculator;
    }

    fillPathSingleTiles(pathLayerData, pathTile, mapWidth, mapHeight)
    {
        let singleEmpty = [pathTile, 0, pathTile];
        let singleFix = [pathTile, pathTile, pathTile];
        let doubleEmpty = [pathTile, 0, 0, pathTile];
        let doubleFix = [pathTile, pathTile, pathTile, pathTile];
        return this.bordersPatterns.applyPatternPipeline(
            pathLayerData,
            [[singleEmpty, singleFix], [doubleEmpty, doubleFix]],
            mapWidth,
            mapHeight
        );
    }

    applyCleanPathBorderTiles(
        splitBorderLayer,
        mapWidth,
        mapHeight,
        additionalLayers,
        cleanPathBorderTilesFromElements,
        pathTile
    ){
        if(!cleanPathBorderTilesFromElements){
            return splitBorderLayer;
        }
        this.layerDataFactory.forEachMapCell(mapWidth, mapHeight, (x, y, index) => {
            if(pathTile !== splitBorderLayer[index]
                && this.mapGridBuilder.isOccupiedByAnotherCollision(
                    x,
                    y,
                    additionalLayers,
                    additionalLayers
                )
            ){
                splitBorderLayer[index] = 0;
            }
        });
        return splitBorderLayer;
    }

    createPathInnerWalls(
        splitBorderLayer,
        mapWidth,
        mapHeight,
        tilesShortcuts,
        applyPathsInnerWalls,
        pathsInnerWallsTilesKey
    ){
        if(!applyPathsInnerWalls){
            return false;
        }
        return this.wallsGenerator.createLayerInnerWalls(
            splitBorderLayer,
            pathsInnerWallsTilesKey,
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
        tilesShortcuts,
        applyPathsOuterWalls,
        pathsOuterWallsTilesKey
    ){
        if(!applyPathsOuterWalls){
            return false;
        }
        return await this.wallsGenerator.createLayerOuterWalls(
            splitBorderLayer,
            pathsOuterWallsTilesKey,
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
            let tileConnections = this.geometryCalculator.connectedTiles(tileIndex, splitBorderLayer, mapWidth);
            let tileConnectionsCount = this.geometryCalculator.countConnected(tileConnections);
            let singleConnection = 1 === tileConnectionsCount.total;
            if(singleConnection){
                pathBorderEndTiles.push(tileIndex);
            }
        }
        return pathBorderEndTiles;
    }

    cleanUpMapBorders(bordersLayer, tilesShortcuts, mapWidth, mapHeight)
    {
        let {sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR} = tilesShortcuts;
        let rowTopInvalidValues = [sBL, sBC, sBR];
        let rowBottomInvalidValues = [sTL, sTC, sTR];
        let rowLeftInvalidValue = [sTR, sMR, sBR];
        let rowRightInvalidValue = [sTL, sML, sBL];
        for(let c = 0; c < mapWidth; c++){
            let currentTopValue = bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(0, c)];
            if(-1 !== rowTopInvalidValues.indexOf(currentTopValue)){
                bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(0, c)] = 0;
            }
            let currentBottomValue = bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(mapHeight - 1, c)];
            if(-1 !== rowBottomInvalidValues.indexOf(currentBottomValue)){
                bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(mapHeight - 1, c)] = 0;
            }
        }
        for(let r = 0; r < mapHeight; r++){
            let currentLeftValue = bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(r, 0)];
            if(-1 !== rowLeftInvalidValue.indexOf(currentLeftValue)){
                bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(r, 0)] = 0;
            }
            let currentRightValue = bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(r, mapWidth - 1)];
            if(-1 !== rowRightInvalidValue.indexOf(currentRightValue)){
                bordersLayer[this.tilePositionCalculator.tileIndexByRowAndColumn(r, mapWidth - 1)] = 0;
            }
        }
        return bordersLayer;
    }

}

module.exports.PathTilesFinisher = PathTilesFinisher;
