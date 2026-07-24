/**
 *
 * Reldens - SpotLayersBuilder
 *
 */

const { Logger, sc } = require('@reldens/utils');

class SpotLayersBuilder
{

    constructor(geometryCalculator, tileVariationsApplier, layerDataFactory)
    {
        this.geometryCalculator = geometryCalculator;
        this.tileVariationsApplier = tileVariationsApplier;
        this.layerDataFactory = layerDataFactory;
    }

    createSpotLayerData(
        width,
        height,
        markPercentage = 100,
        tileIndex = 0,
        applyBorders = false,
        spotFillProcessor = null
    ){
        let totalTiles = spotFillProcessor.computeTotalTiles(width, height, applyBorders);
        let layerData = new Array(width * height).fill(0);
        if(100 <= markPercentage){
            return spotFillProcessor.fillAllTiles(layerData, width, height, tileIndex, applyBorders);
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
            neighbors = sc.shuffleArray(neighbors);
            for(let n = 0; n < neighbors.length; n++){
                let neighbor = neighbors[n];
                if(!visited[neighbor]){
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            }
        }
        return spotFillProcessor.fillInternalHolesAndBalancePerimeter(layerData, width, height, tileIndex, applyBorders);
    }

    createRandomPathLayer(
        groundSpotConfig,
        spotTile,
        bordersLayer,
        spotLayer,
        spotTilesShortcuts,
        spotBorderAnalyzer,
        spotBordersAndCorners,
        pathTile,
        pathSize
    ){
        let placeRandomPath = sc.get(groundSpotConfig, 'placeRandomPath', false);
        if(!placeRandomPath){
            return false;
        }
        let borderTiles = spotBorderAnalyzer.findBorderTiles(bordersLayer, groundSpotConfig, spotTile);
        if(0 === borderTiles.length){
            return false;
        }
        let pathTileIndexes = spotBorderAnalyzer.fetchPathTileIndexes(
            borderTiles,
            groundSpotConfig.width,
            groundSpotConfig.height,
            groundSpotConfig.borderOuterWalls,
            pathSize
        );
        pathTileIndexes.sort((a, b) => a - b);
        let pathLayerData = Array(groundSpotConfig.width * groundSpotConfig.height).fill(0);
        let removedBorders = {};
        let middleIndex = Math.floor(pathTileIndexes.length / 2);
        for(let i = 0; i < pathTileIndexes.length; i++){
            let tileIndex = pathTileIndexes[i];
            if(i === middleIndex){
                pathLayerData[tileIndex] = pathTile;
            }
            if(groundSpotConfig.applyCornersTiles){
                removedBorders[tileIndex] = bordersLayer[tileIndex];
                bordersLayer[tileIndex] = 0;
                spotLayer[tileIndex] = spotTilesShortcuts.p;
            }
        }
        bordersLayer = spotBordersAndCorners.applyBorderEndTiles(
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

    createVariationsLayer(groundSpotConfig, tilesKey, spotLayer, spotTile, elementsVariations)
    {
        let spotTileVariations = sc.get(
            groundSpotConfig,
            'spotTileVariations',
            elementsVariations[tilesKey]
        );
        let variableTilesPercentage = sc.get(groundSpotConfig, 'variableTilesPercentage', 0);
        if(!sc.isArray(spotTileVariations) || 0 === spotTileVariations.length || 0 === variableTilesPercentage){
            return false;
        }
        return this.tileVariationsApplier.applyTilesVariations(
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
        layerElements[layerKey] = [
            this.layerDataFactory.buildTileLayer(layerKey, spotLayer, groundSpotConfig.width, groundSpotConfig.height)
        ];
        if(pathLayer){
            layerElements[layerKey].push(pathLayer);
        }
        if(variationsLayer){
            layerElements[layerKey].push(this.layerDataFactory.buildTileLayer(
                layerKey + '-spot-variations',
                variationsLayer,
                groundSpotConfig.width,
                groundSpotConfig.height
            ));
        }
        if(groundSpotConfig.splitBordersInLayers && bordersLayer){
            if(wallsLayer){
                let wallsLayerName = layerKey+'-inner-walls'+sc.get(groundSpotConfig, 'wallsLayerSuffix', '');
                layerElements[layerKey].push(this.layerDataFactory.buildTileLayer(
                    wallsLayerName,
                    wallsLayer,
                    groundSpotConfig.width,
                    groundSpotConfig.height
                ));
            }
            let bordersLayerName = layerKey+'-borders'+sc.get(groundSpotConfig, 'borderLayerSuffix', '');
            layerElements[layerKey].push(this.layerDataFactory.buildTileLayer(
                bordersLayerName,
                bordersLayer,
                groundSpotConfig.width,
                groundSpotConfig.height
            ));
            if(outerWallsLayer){
                let outerWallsLayerName = layerKey+'-outer-walls'+sc.get(groundSpotConfig, 'outerWallsLayerSuffix', '');
                layerElements[layerKey].push(this.layerDataFactory.buildTileLayer(
                    outerWallsLayerName,
                    outerWallsLayer,
                    groundSpotConfig.width,
                    groundSpotConfig.height
                ));
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

    generateInvisibleSpots(staticLayers, generatedSpots, mapWidth, mapHeight, spotPlacement, generateLayerWithData)
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
                let placement = spotPlacement.findFreeSpotPlacement(
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
                let spotMapLayerData = this.layerDataFactory.createEmptyLayerData(mapWidth, mapHeight);
                for(let y = 0; y < groundSpotConfig.height; y++){
                    for(let x = 0; x < groundSpotConfig.width; x++){
                        let tileIndex = this.layerDataFactory.tileIndex(y, x, groundSpotConfig.width);
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
                staticLayers.push(generateLayerWithData(spotLayerKey, spotMapLayerData));
            }
        }
        return staticLayers;
    }

}

module.exports.SpotLayersBuilder = SpotLayersBuilder;
