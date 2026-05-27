/**
 *
 * Reldens - SpotGenerator
 *
 */

const { GeometryCalculator } = require('../utilities/geometry-calculator');
const { Logger, sc } = require('@reldens/utils');

class SpotGenerator
{

    constructor(generator)
    {
        this.geometryCalculator = new GeometryCalculator();
        this.groundSpots = generator.groundSpots;
        this.groundSpotsPropertiesMappers = generator.groundSpotsPropertiesMappers;
        this.groundTile = generator.groundTile;
        this.pathTile = generator.pathTile;
        this.pathSize = generator.pathSize;
        this.elementsVariations = generator.elementsVariations;
        this.mapTilesShortcuts = generator.mapTilesShortcuts.bind(generator);
        this.generateLayerWithData = generator.generateLayerWithData.bind(generator);
        this.applyTilesVariations = generator.applyTilesVariations.bind(generator);
        this.shuffleArray = generator.shuffleArray.bind(generator);
        this.applyBordersAndCornersTiles = generator.applyBordersAndCornersTiles.bind(generator);
        this.rotateLayer90Degrees = generator.rotateLayer90Degrees.bind(generator);
        this.rollbackRotation90Degrees = generator.rollbackRotation90Degrees.bind(generator);
        this.replaceSequences = generator.replaceSequences.bind(generator);
        this.mergeLayers = generator.mergeLayers.bind(generator);
        this.createLayerInnerWalls = generator.wallsGenerator.createLayerInnerWalls.bind(generator.wallsGenerator);
        this.createLayerOuterWalls = generator.wallsGenerator.createLayerOuterWalls.bind(generator.wallsGenerator);
    }

    async generateSpots(
        generatedSpots,
        generateSpotsWithDepth,
        layerElements,
        elementsQuantity,
        elementsFreeSpaceAround,
        elementsAllowPathsInFreeSpace,
        mapCenteredElements
    ){
        for(let spotKey of Object.keys(this.groundSpots)){
            let groundSpotConfig = this.groundSpots[spotKey];
            let spotsQuantity = Number(sc.get(groundSpotConfig, 'quantity', 1));
            if(0 === spotsQuantity){
                Logger.warning('Ground spot was set with quantity 0.', groundSpotConfig);
                continue;
            }
            let addCollisions = !groundSpotConfig.walkable ? '-collisions' : '';
            let layerName = sc.get(groundSpotConfig, 'layerName', 'ground-spot-'+spotKey)+addCollisions;
            let tilesKey = sc.get(groundSpotConfig, 'tilesKey', spotKey);
            let spotTile = sc.get(groundSpotConfig, 'spotTile', this.groundTile);
            if(this.groundSpotsPropertiesMappers[tilesKey]) {
                this.groundSpotsPropertiesMappers[tilesKey].map();
            }
            let spotTilesShortcuts = this.mapTilesShortcuts(
                tilesKey,
                spotTile,
                this.groundSpotsPropertiesMappers[tilesKey]
            );
            if(spotTilesShortcuts.p && spotTile !== spotTilesShortcuts.p){
                Logger.debug('Replaced spot tile "'+spotTile+'" by "'+spotTilesShortcuts.p+'".');
                spotTile = spotTilesShortcuts.p;
            }
            let originalWidth = groundSpotConfig.width;
            let originalHeight = groundSpotConfig.height;
            let spotLayers = {};
            for(let i = 0; i < spotsQuantity; i++){
                groundSpotConfig.width = originalWidth;
                groundSpotConfig.height = originalHeight;
                let spotLayer = this.createSpotLayerData(
                    groundSpotConfig.width,
                    groundSpotConfig.height,
                    groundSpotConfig.markPercentage,
                    spotTile,
                    groundSpotConfig.applyCornersTiles
                );
                if(groundSpotConfig.borderOuterWalls){
                    let increasedLayer = this.increaseLayerSize(spotLayer,
                        groundSpotConfig.width,
                        groundSpotConfig.height,
                        sc.get(groundSpotConfig, 'borderOuterWallsIncreaseLayerSize', 4)
                    );
                    spotLayer = increasedLayer.layerData;
                    groundSpotConfig.width = increasedLayer.width;
                    groundSpotConfig.height = increasedLayer.height;
                }
                let bordersLayer = this.applySplitBordersAndCorners(
                    groundSpotConfig.applyCornersTiles,
                    groundSpotConfig.width,
                    groundSpotConfig.height,
                    groundSpotConfig.splitBordersInLayers,
                    spotLayer,
                    spotTilesShortcuts
                );
                let pathLayerResult = this.createRandomPathLayer(
                    groundSpotConfig,
                    spotTile,
                    bordersLayer,
                    spotLayer,
                    spotTilesShortcuts
                );
                let pathLayer = pathLayerResult.pathLayer;
                bordersLayer = pathLayerResult ? pathLayerResult.bordersLayer : bordersLayer;
                spotLayer = pathLayerResult ? pathLayerResult.spotLayer : spotLayer;
                let wallsLayer = false;
                let outerWallsLayer = false;
                if(groundSpotConfig.applyCornersTiles){
                    spotLayer = this.fillEmptyTilesBetweenBordersAndSpotGround(
                        spotLayer,
                        bordersLayer,
                        groundSpotConfig.width,
                        groundSpotConfig.height,
                        spotTile
                    );
                    if(groundSpotConfig.borderInnerWalls){
                        wallsLayer = this.createLayerInnerWalls(
                            bordersLayer,
                            tilesKey,
                            spotTilesShortcuts,
                            groundSpotConfig.width,
                            groundSpotConfig.height
                        );
                    }
                    if(groundSpotConfig.borderOuterWalls){
                        let result = await this.createLayerOuterWalls(
                            bordersLayer,
                            tilesKey,
                            spotTilesShortcuts,
                            groundSpotConfig.width,
                            groundSpotConfig.height,
                            wallsLayer
                        );
                        outerWallsLayer = result.outerWallsLayer;
                        bordersLayer = result.bordersLayer;
                    }
                }
                if(!groundSpotConfig.splitBordersInLayers){
                    spotLayer = bordersLayer;
                }
                let variationsLayer = this.createVariationsLayer(groundSpotConfig, tilesKey, spotLayer, spotTile);
                let layerKey = layerName+'-s'+i;
                spotLayers[layerKey] = spotLayer;
                if(groundSpotConfig.isElement){
                    let saveResult = this.saveLayerElements(
                        layerKey,
                        groundSpotConfig,
                        spotLayer,
                        variationsLayer,
                        pathLayer,
                        bordersLayer,
                        wallsLayer,
                        outerWallsLayer,
                        layerElements,
                        elementsQuantity,
                        elementsFreeSpaceAround,
                        elementsAllowPathsInFreeSpace,
                        mapCenteredElements
                    );
                    if(saveResult){
                        layerElements = saveResult.layerElements;
                        elementsQuantity = saveResult.elementsQuantity;
                        elementsFreeSpaceAround = saveResult.elementsFreeSpaceAround;
                        elementsAllowPathsInFreeSpace = saveResult.elementsAllowPathsInFreeSpace;
                        mapCenteredElements = saveResult.mapCenteredElements;
                    }
                }
            }
            groundSpotConfig.width = originalWidth;
            groundSpotConfig.height = originalHeight;
            groundSpotConfig.spotLayers = spotLayers;
            if(sc.get(groundSpotConfig, 'depth', false) && 0 < Object.keys(spotLayers).length){
                generateSpotsWithDepth[spotKey] = groundSpotConfig;
            }
            generatedSpots[spotKey] = groundSpotConfig;
        }
        return {
            generatedSpots,
            generateSpotsWithDepth,
            layerElements,
            elementsQuantity,
            elementsFreeSpaceAround,
            elementsAllowPathsInFreeSpace,
            mapCenteredElements
        };
    }

    generateInvisibleSpots(staticLayers, generatedSpots, mapWidth, mapHeight)
    {
        let occupiedRects = [];
        for(let spotKey of Object.keys(generatedSpots)){
            let groundSpotConfig = generatedSpots[spotKey];
            if(groundSpotConfig.isElement){
                continue;
            }
            if(!groundSpotConfig.spotLayers){
                Logger.warning('None spot layers were created for "'+spotKey+'".');
                continue;
            }
            let maxX = Math.max(0, mapWidth - groundSpotConfig.width);
            let maxY = Math.max(0, mapHeight - groundSpotConfig.height);
            for(let spotLayerKey of Object.keys(groundSpotConfig.spotLayers)){
                let placement = this.findFreeSpotPlacement(
                    occupiedRects,
                    groundSpotConfig.width,
                    groundSpotConfig.height,
                    maxX,
                    maxY
                );
                let randomX = placement.x;
                let randomY = placement.y;
                occupiedRects.push({
                    x: randomX,
                    y: randomY,
                    width: groundSpotConfig.width,
                    height: groundSpotConfig.height
                });
                let spotLayerData = groundSpotConfig.spotLayers[spotLayerKey];
                let spotMapLayerData = Array(mapWidth * mapHeight).fill(0);
                for(let y = 0; y < groundSpotConfig.height; y++){
                    for(let x = 0; x < groundSpotConfig.width; x++){
                        let tileIndex = y * groundSpotConfig.width + x;
                        if(0 === spotLayerData[tileIndex]){
                            continue;
                        }
                        let gridX = randomX + x;
                        let gridY = randomY + y;
                        if(gridX < 0 || gridX >= mapWidth || gridY < 0 || gridY >= mapHeight){
                            continue;
                        }
                        spotMapLayerData[gridY * mapWidth + gridX] = spotLayerData[tileIndex];
                    }
                }
                staticLayers.push(this.generateLayerWithData(spotLayerKey, spotMapLayerData));
            }
        }
        return staticLayers;
    }

    findFreeSpotPlacement(occupiedRects, spotWidth, spotHeight, maxX, maxY)
    {
        let maxAttempts = 30;
        for(let attempt = 0; attempt < maxAttempts; attempt++){
            let candidateX = 0 < maxX ? Math.floor(Math.random() * maxX) : 0;
            let candidateY = 0 < maxY ? Math.floor(Math.random() * maxY) : 0;
            if(!this.rectOverlapsAny(candidateX, candidateY, spotWidth, spotHeight, occupiedRects)){
                return {x: candidateX, y: candidateY};
            }
        }
        return {
            x: 0 < maxX ? Math.floor(Math.random() * maxX) : 0,
            y: 0 < maxY ? Math.floor(Math.random() * maxY) : 0
        };
    }

    rectOverlapsAny(x, y, width, height, occupiedRects)
    {
        for(let rect of occupiedRects){
            if(x < rect.x + rect.width
                && x + width > rect.x
                && y < rect.y + rect.height
                && y + height > rect.y
            ){
                return true;
            }
        }
        return false;
    }

    createSpotLayerData(width, height, markPercentage = 100, tileIndex = 0, applyBorders = false)
    {
        let totalTiles = this.computeTotalTiles(width, height, applyBorders);
        let layerData = new Array(width * height).fill(0);
        if(100 <= markPercentage){
            return this.fillAllTiles(layerData, width, height, tileIndex, applyBorders);
        }
        let tilesToFill = Math.round(totalTiles * (markPercentage / 100));
        if(0 >= tilesToFill){
            return layerData;
        }
        let visited = new Array(width * height).fill(false);
        let startIndex = this.geometryCalculator.randomCentralIndex(width, height, applyBorders);
        let queue = [startIndex];
        visited[startIndex] = true;
        let placedCount = 0;
        while(queue.length > 0 && placedCount < tilesToFill){
            let pick = Math.floor(Math.random() * queue.length);
            let current = queue[pick];
            queue[pick] = queue[queue.length - 1];
            queue.pop();
            if(0 === layerData[current]){
                layerData[current] = tileIndex;
                placedCount++;
            }
            let neighbors = this.geometryCalculator.get4Neighbors(current, width, height, applyBorders);
            neighbors = this.shuffleArray(neighbors);
            for(let n = 0; n < neighbors.length; n++){
                let neighbor = neighbors[n];
                if(!visited[neighbor]){
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            }
        }
        return this.fillInternalHolesAndBalancePerimeter(layerData, width, height, tileIndex, applyBorders);
    }

    createRandomPathLayer(groundSpotConfig, spotTile, bordersLayer, spotLayer, spotTilesShortcuts)
    {
        let placeRandomPath = sc.get(groundSpotConfig, 'placeRandomPath', false);
        if(!placeRandomPath){
            return false;
        }
        let borderTiles = this.findBorderTiles(bordersLayer, groundSpotConfig, spotTile);
        if(0 === borderTiles.length){
            return false;
        }
        let pathTileIndexes = this.fetchPathTileIndexes(
            borderTiles,
            groundSpotConfig.width,
            groundSpotConfig.height,
            groundSpotConfig.borderOuterWalls
        );
        pathTileIndexes.sort((a, b) => a - b);
        let pathLayerData = Array(groundSpotConfig.width * groundSpotConfig.height).fill(0);
        let removedBorders = {};
        let middleIndex = Math.floor(pathTileIndexes.length / 2);
        for(let i = 0; i < pathTileIndexes.length; i++){
            let tileIndex = pathTileIndexes[i];
            if(i === middleIndex){
                pathLayerData[tileIndex] = this.pathTile;
            }
            if(groundSpotConfig.applyCornersTiles){
                removedBorders[tileIndex] = bordersLayer[tileIndex];
                bordersLayer[tileIndex] = 0;
                spotLayer[tileIndex] = spotTilesShortcuts.p;
            }
        }
        bordersLayer = this.applyBorderEndTiles(
            bordersLayer,
            pathTileIndexes,
            removedBorders,
            spotTilesShortcuts,
            groundSpotConfig.width,
            groundSpotConfig.height
        );
        return {
            pathLayer: {
                height: groundSpotConfig.height,
                name: 'path',
                opacity: 1,
                type: 'tilelayer',
                visible: true,
                width: groundSpotConfig.width,
                x: 0,
                y: 0,
                data: pathLayerData
            },
            bordersLayer,
            spotLayer
        };
    }

    createVariationsLayer(groundSpotConfig, tilesKey, spotLayer, spotTile)
    {
        let spotTileVariations = sc.get(
            groundSpotConfig,
            'spotTileVariations',
            this.elementsVariations[tilesKey]
        );
        let variableTilesPercentage = sc.get(groundSpotConfig, 'variableTilesPercentage', 0);
        if(!sc.isArray(spotTileVariations) || 0 === spotTileVariations.length || 0 === variableTilesPercentage){
            return false;
        }
        return this.applyTilesVariations(
            Array(groundSpotConfig.width * groundSpotConfig.height).fill(0),
            groundSpotConfig.width,
            groundSpotConfig.height,
            spotLayer.filter(tile => tile === spotTile).length,
            spotTileVariations,
            variableTilesPercentage,
            spotLayer,
            spotTile
        );
    }

    saveLayerElements(
        layerKey,
        groundSpotConfig,
        spotLayer,
        variationsLayer,
        pathLayer,
        bordersLayer,
        wallsLayer,
        outerWallsLayer,
        layerElements,
        elementsQuantity,
        elementsFreeSpaceAround,
        elementsAllowPathsInFreeSpace,
        mapCenteredElements
    ){
        layerElements[layerKey] = [{
            height: groundSpotConfig.height,
            name: layerKey,
            opacity: 1,
            type: 'tilelayer',
            visible: true,
            width: groundSpotConfig.width,
            x: 0,
            y: 0,
            data: spotLayer
        }];
        if(pathLayer){
            layerElements[layerKey].push(pathLayer);
        }
        if(variationsLayer){
            layerElements[layerKey].push({
                height: groundSpotConfig.height,
                name: layerKey + '-spot-variations',
                opacity: 1,
                type: 'tilelayer',
                visible: true,
                width: groundSpotConfig.width,
                x: 0,
                y: 0,
                data: variationsLayer
            });
        }
        if(groundSpotConfig.splitBordersInLayers && bordersLayer){
            if(wallsLayer){
                let wallsLayerName = layerKey+'-inner-walls'+sc.get(groundSpotConfig, 'wallsLayerSuffix', '');
                layerElements[layerKey].push({
                    height: groundSpotConfig.height,
                    name: wallsLayerName,
                    opacity: 1,
                    type: 'tilelayer',
                    visible: true,
                    width: groundSpotConfig.width,
                    x: 0,
                    y: 0,
                    data: wallsLayer
                });
            }
            let bordersLayerName = layerKey+'-borders'+sc.get(groundSpotConfig, 'borderLayerSuffix', '');
            layerElements[layerKey].push({
                height: groundSpotConfig.height,
                name: bordersLayerName,
                opacity: 1,
                type: 'tilelayer',
                visible: true,
                width: groundSpotConfig.width,
                x: 0,
                y: 0,
                data: bordersLayer
            });
            if(outerWallsLayer){
                let outerWallsLayerName = layerKey+'-outer-walls'+sc.get(groundSpotConfig, 'outerWallsLayerSuffix', '');
                layerElements[layerKey].push({
                    height: groundSpotConfig.height,
                    name: outerWallsLayerName,
                    opacity: 1,
                    type: 'tilelayer',
                    visible: true,
                    width: groundSpotConfig.width,
                    x: 0,
                    y: 0,
                    data: outerWallsLayer
                });
            }
        }
        elementsQuantity[layerKey] = 1;
        elementsFreeSpaceAround[layerKey] = groundSpotConfig.freeSpaceAround;
        elementsAllowPathsInFreeSpace[layerKey] = groundSpotConfig.allowPathsInFreeSpace;
        let mapCentered = sc.get(groundSpotConfig, 'mapCentered', 0);
        if(0 < mapCentered){
            mapCenteredElements[layerKey] = mapCentered;
        }
        return {
            layerElements,
            elementsQuantity,
            elementsFreeSpaceAround,
            elementsAllowPathsInFreeSpace,
            mapCenteredElements
        };
    }

    findBorderTiles(layer, groundSpotConfig, tileValue)
    {
        let width = groundSpotConfig.width;
        let height = groundSpotConfig.height;
        let borderTiles = [];
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let index = y * width + x;
                if(groundSpotConfig.applyCornersTiles){
                    if(tileValue !== layer[index] && 0 !== layer[index]){
                        borderTiles.push(index);
                    }
                    continue;
                }
                if(tileValue !== layer[index]){
                    continue;
                }
                let hasEmptyNeighbor = false;
                if(0 < y && 0 === layer[(y-1) * width + x]){
                    hasEmptyNeighbor = true;
                }
                if(height - 1 > y && 0 === layer[(y+1) * width + x]){
                    hasEmptyNeighbor = true;
                }
                if(0 < x && 0 === layer[y * width + (x-1)]){
                    hasEmptyNeighbor = true;
                }
                if(width - 1 > x && 0 === layer[y * width + (x+1)]){
                    hasEmptyNeighbor = true;
                }
                if(hasEmptyNeighbor){
                    borderTiles.push(index);
                }
            }
        }
        return borderTiles;
    }

    findContinuousBorderSequences(borderTiles, width, height, pathSize)
    {
        let rowGroups = [];
        for(let i = 0; i < height; i++){
            rowGroups.push([]);
        }
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            let y = Math.floor(index / width);
            rowGroups[y].push(index % width);
        }
        let horizontalSequences = [];
        for(let y = 0; y < rowGroups.length; y++){
            if(0 === rowGroups[y].length){
                continue;
            }
            let row = rowGroups[y].sort((a, b) => a - b);
            for(let i = 0; i < row.length - pathSize + 1; i++){
                let continuous = true;
                for(let j = 1; j < pathSize; j++){
                    if(row[i + j] !== row[i] + j){
                        continuous = false;
                        break;
                    }
                }
                if(continuous){
                    let sequence = [];
                    for(let j = 0; j < pathSize; j++){
                        sequence.push(y * width + row[i + j]);
                    }
                    horizontalSequences.push(sequence);
                }
            }
        }
        let colGroups = [];
        for(let i = 0; i < width; i++){
            colGroups.push([]);
        }
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            let x = index % width;
            colGroups[x].push(Math.floor(index / width));
        }
        let verticalSequences = [];
        for(let x = 0; x < colGroups.length; x++){
            if(0 === colGroups[x].length){
                continue;
            }
            let col = colGroups[x].sort((a, b) => a - b);
            for(let i = 0; i < col.length - pathSize + 1; i++){
                let continuous = true;
                for(let j = 1; j < pathSize; j++){
                    if(col[i + j] !== col[i] + j){
                        continuous = false;
                        break;
                    }
                }
                if(continuous){
                    let sequence = [];
                    for(let j = 0; j < pathSize; j++){
                        sequence.push((col[i + j]) * width + x);
                    }
                    verticalSequences.push(sequence);
                }
            }
        }
        return [...horizontalSequences, ...verticalSequences];
    }

    fetchPathTileIndexes(borderTiles, width, height, borderOuterWalls)
    {
        if(1 < this.pathSize){
            let sequences = this.findContinuousBorderSequences(borderTiles, width, height, this.pathSize);
            if(0 < sequences.length){
                let randomIndex = Math.floor(Math.random() * sequences.length);
                return sequences[randomIndex];
            }
        }
        let randomBorderTile = this.fetchRandomBorderTileIndex(borderTiles, width, height, borderOuterWalls);
        let pathTileIndexes = [randomBorderTile];
        if(1 < this.pathSize){
            let additionalTiles = this.findAdjacentBorderTiles(borderTiles, randomBorderTile, width, this.pathSize - 1);
            pathTileIndexes = [...pathTileIndexes, ...additionalTiles];
        }
        return pathTileIndexes;
    }

    fetchRandomBorderTileIndex(borderTiles, width, height, borderOuterWalls)
    {
        let minDistanceInTiles = borderOuterWalls ? 5 : 1;
        let tilesWithDistance = [];
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            let x = index % width;
            let y = Math.floor(index / width);
            let distToEdge = Math.min(x, width - minDistanceInTiles - x, y, height - minDistanceInTiles - y);
            if(0 === distToEdge){
                tilesWithDistance.push({ index, distToEdge });
            }
        }
        tilesWithDistance.sort(function(a, b)
        {
            return a.distToEdge - b.distToEdge;
        });
        let randomIndex = Math.floor(Math.random() * tilesWithDistance.length);
        return tilesWithDistance[randomIndex].index;
    }

    findAdjacentBorderTiles(borderTiles, startIndex, width, count)
    {
        let result = [];
        if(0 === borderTiles.length){
            return result;
        }
        if(0 >= count){
            return result;
        }
        let startX = startIndex % width;
        let startY = Math.floor(startIndex / width);
        let sortedTiles = [];
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            if(index === startIndex){
                continue;
            }
            let x = index % width;
            let y = Math.floor(index / width);
            let distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            sortedTiles.push({index, distance});
        }
        sortedTiles.sort(function(a, b){
            return a.distance - b.distance;
        });
        for(let i = 0; i < count && i < sortedTiles.length; i++){
            result.push(sortedTiles[i].index);
        }
        return result;
    }

    fillInternalHolesAndBalancePerimeter(layerData, width, height, tileIndex, applyBorders)
    {
        let minX = applyBorders ? 1 : 0;
        let maxX = applyBorders ? width - 2 : width - 1;
        let minY = applyBorders ? 1 : 0;
        let maxY = applyBorders ? height - 2 : height - 1;
        let replacedTiles = 0;
        for(let y = minY; y <= maxY; y++){
            for(let x = minX; x <= maxX; x++){
                let index = y * width + x;
                if(0 !== layerData[index]){
                    continue;
                }
                if(this.isInternalHole(x, y, layerData, width, height)){
                    layerData[index] = tileIndex;
                    replacedTiles++;
                }
            }
        }
        return layerData;
    }

    isInternalHole(x, y, layerData, width, height)
    {
        let surroundingTiles = 0;
        for(let dy = -1; dy <= 1; dy++){
            for(let dx = -1; dx <= 1; dx++){
                if(0 === dx && 0 === dy){
                    continue;
                }
                let nx = x + dx;
                let ny = y + dy;
                if(nx < 0 || nx >= width || ny < 0 || ny >= height){
                    continue;
                }
                let neighborIndex = ny * width + nx;
                if(0 !== layerData[neighborIndex]){
                    surroundingTiles++;
                }
            }
        }
        return surroundingTiles >= 6;
    }

    fillEmptyTilesBetweenBordersAndSpotGround(spotLayer, bordersLayer, width, height, spotTile)
    {
        let spotLayerClone = [...spotLayer];
        let mergedLayer = this.mergeLayers(spotLayerClone, [...bordersLayer]);
        let resultLayer = [...spotLayerClone];
        for(let y = 0; y < height; y++){
            let rowStart = y * width;
            let row = mergedLayer.slice(rowStart, rowStart + width);
            let firstNonZeroIndex = -1;
            for(let x = 0; x < width; x++){
                if(0 === row[x]){
                    continue;
                }
                if(-1 !== firstNonZeroIndex){
                    if(0 !== spotLayerClone[rowStart + firstNonZeroIndex] || 0 !== spotLayerClone[rowStart + x]){
                        for(let fillX = firstNonZeroIndex + 1; fillX < x; fillX++){
                            resultLayer[rowStart + fillX] = spotTile;
                        }
                    }
                }
                firstNonZeroIndex = x;
            }
        }
        for(let x = 0; x < width; x++){
            let firstNonZeroIndex = -1;
            for(let y = 0; y < height; y++){
                let index = y * width + x;
                if(0 === mergedLayer[index]){
                    continue;
                }
                if(-1 !== firstNonZeroIndex){
                    if(0 !== spotLayerClone[firstNonZeroIndex * width + x] || 0 !== spotLayerClone[y * width + x]){
                        for(let fillY = firstNonZeroIndex + 1; fillY < y; fillY++){
                            resultLayer[fillY * width + x] = spotTile;
                        }
                    }
                }
                firstNonZeroIndex = y;
            }
        }
        return resultLayer;
    }

    fillAllTiles(layerData, width, height, tileIndex, applyBorders)
    {
        if(!applyBorders){
            for(let i = 0; i < layerData.length; i++){
                layerData[i] = tileIndex;
            }
            return layerData;
        }
        if(width <= 2 || height <= 2){
            return layerData;
        }
        for(let y = 1; y < height - 1; y++){
            for(let x = 1; x < width - 1; x++){
                let index = y * width + x;
                layerData[index] = tileIndex;
            }
        }
        return layerData;
    }

    computeTotalTiles(width, height, applyBorders)
    {
        if(!applyBorders){
            return width * height;
        }
        if(width <= 2 || height <= 2){
            return 0;
        }
        return (width - 2) * (height - 2);
    }

    increaseLayerSize(layerData, width, height, extraTiles)
    {
        let oldData = layerData;
        let newWidth = width + extraTiles * 2;
        let newHeight = height + extraTiles * 2;
        let newData = new Array(newWidth * newHeight).fill(0);
        for(let y = 0; y < newHeight; y++){
            for(let x = 0; x < newWidth; x++){
                let oldX = x - extraTiles;
                let oldY = y - extraTiles;
                if(oldX >= 0 && oldX < width && oldY >= 0 && oldY < height){
                    let oldIndex = oldY * width + oldX;
                    let newIndex = y * newWidth + x;
                    newData[newIndex] = oldData[oldIndex] || 0;
                }
            }
        }
        return {
            width: newWidth,
            height: newHeight,
            layerData: newData
        };
    }

    applySplitBordersAndCorners(applyCornersTiles, width, height, splitBordersInLayers, mainLayer, tilesShortcuts)
    {
        if(!applyCornersTiles){
            return mainLayer;
        }
        let splitBordersLayer = [...mainLayer];
        let bordersLayer = this.applyBordersAndCornersTiles(
            splitBordersLayer,
            width,
            height,
            tilesShortcuts
        );
        if(!splitBordersInLayers){
            return bordersLayer;
        }
        bordersLayer = bordersLayer.map(tile => tile === tilesShortcuts.p ? 0 : tile);
        for(let i = 0; i < bordersLayer.length; i++){
            if(-1 !== [tilesShortcuts.cBL, tilesShortcuts.cBR].indexOf(bordersLayer[i])){
                mainLayer[i] = tilesShortcuts.p;
            }
        }
        return bordersLayer;
    }

    applyBorderEndTiles(bordersLayer, pathTileIndexes, removedBorders, spotTiles, layerWidth, layerHeight)
    {
        let {p, sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = spotTiles;
        let connectionsData = {};
        let filteredFirstAndLastTiles = pathTileIndexes.filter((tileIndex) => {
            let tileConnections = this.geometryCalculator.connectedTiles(tileIndex, bordersLayer, layerWidth);
            let tileConnectionsCount = this.geometryCalculator.countConnected(tileConnections);
            let singleConnection = 1 === tileConnectionsCount.total;
            if(singleConnection){
                connectionsData[tileIndex] = {tileConnections, tileConnectionsCount};
            }
            return singleConnection;
        });
        for(let tileIndex of filteredFirstAndLastTiles){
            let isLeft = 0 !== connectionsData[tileIndex].tileConnections.left;
            let isTop = 0 !== connectionsData[tileIndex].tileConnections.top;
            if(removedBorders[tileIndex] === sBC || removedBorders[tileIndex] === sTL){
                bordersLayer[tileIndex] = isLeft ? cBL : cBR;
                if(0 === bordersLayer[tileIndex + layerWidth]){
                    bordersLayer[tileIndex + layerWidth] = isLeft ? cTL : cTR;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sTC || removedBorders[tileIndex] === sTR){
                bordersLayer[tileIndex] = isLeft ? cTL : cTR;
                if(0 === bordersLayer[tileIndex - layerWidth]){
                    bordersLayer[tileIndex - layerWidth] = isLeft ? cBL : cBR;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sML || removedBorders[tileIndex] === sBL){
                bordersLayer[tileIndex] = isTop ? cTL : cBL;
                if(0 === bordersLayer[tileIndex - 1]){
                    bordersLayer[tileIndex - 1] = isTop ? cTR : cBR;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sMR || removedBorders[tileIndex] === sBR){
                bordersLayer[tileIndex] = isTop ? cTR : cBR;
                if(0 === bordersLayer[tileIndex + 1]){
                    bordersLayer[tileIndex + 1] = isTop ? cTL : cBL;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sBL){
                bordersLayer[tileIndex] = isTop ? cTR : cBR;
            }
            if(removedBorders[tileIndex] === sBR){
                bordersLayer[tileIndex] = isTop ? cTL : cBL;
            }
        }
        this.replaceSequences(
            bordersLayer,
            [
                [[cBR, sTC], [cTR, sTC]],
                [[sBC, cBR, cBL], [sBC, sBC, cBL]],
                [[cBR, cBL, sBC], [cBR, sBC, sBC]]
            ],
            layerWidth
        );
        bordersLayer = this.rotateLayer90Degrees(bordersLayer, layerWidth, layerHeight);
        this.replaceSequences(
            bordersLayer,
            [
                [[cBR, cTR, sMR], [cBR, sMR, sMR]],
                [[0, cTR, cTR], [0, cTR, 0]]
            ],
            layerHeight
        );
        bordersLayer = this.rollbackRotation90Degrees(bordersLayer, layerHeight, layerWidth);
        return bordersLayer;
    }

}

module.exports.SpotGenerator = SpotGenerator;
