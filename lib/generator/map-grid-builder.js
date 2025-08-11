/**
 *
 * Reldens - MapGridBuilder
 *
 */

const { Logger, sc } = require('@reldens/utils');

class MapGridBuilder
{

    generateEmptyMap(mapSize, groundTile, calculateMapSizeWithFreeSpace)
    {
        let {mapWidth, mapHeight} = this.setMapSize(mapSize, calculateMapSizeWithFreeSpace);
        let mapGrid = Array.from({length: mapHeight}, () => Array(mapWidth).fill(true));
        let groundLayerData = null;
        if(0 !== groundTile){
            // @TODO - BETA - If 0 < this.groundTiles.length then fill with random this.groundTiles.
            groundLayerData = Array(mapWidth * mapHeight).fill(groundTile);
        }
        return {mapGrid, groundLayerData, mapWidth, mapHeight};
    }

    setMapSize(mapSize, calculateMapSizeWithFreeSpace)
    {
        if(0 < mapSize.mapWidth && 0 < mapSize.mapHeight){
            return {mapWidth: mapSize.mapWidth, mapHeight: mapSize.mapHeight};
        }
        return calculateMapSizeWithFreeSpace();
    }

    markMapGridPosition(mapGrid, tileY, tileX, walkable)
    {
        if(0 > tileY || !sc.hasOwn(mapGrid, tileY)){
            if(0 < tileY){
                Logger.debug('None tileY in mapGrid: '+tileY);
            }
            return;
        }
        if(0 > tileX || !sc.hasOwn(mapGrid[tileY], tileX)){
            if(0 < tileX){
                Logger.debug('None tileX in tileY: '+tileX);
            }
            return;
        }
        mapGrid[tileY][tileX] = walkable;
    }

    markBorderAsNotWalkable(mapGrid, mapWidth, mapHeight)
    {
        // mark the border as occupied in the mapGrid
        for(let x = 0; x < mapWidth; x++){
            mapGrid[0][x] = false;
            mapGrid[mapHeight - 1][x] = false;
        }
        for(let y = 0; y < mapHeight; y++){
            mapGrid[y][0] = false;
            mapGrid[y][mapWidth - 1] = false;
        }
    }

    unblockTemporalBlockedPoints(temporalBlockedPositionsToAvoidElements, grid, mapGrid)
    {
        let filteredPoints = temporalBlockedPositionsToAvoidElements.filter(point => point.allowPathsInFreeSpace);
        //Logger.debug('Unblock temporal blocked points.', filteredPoints);
        for(let positionPoints of filteredPoints){
            let {previousTileY, previousTileX, nextTileY, nextTileX} = positionPoints;
            this.markMapGridPosition(mapGrid, previousTileY, previousTileX, true);
            this.markMapGridPosition(mapGrid, previousTileY, nextTileX, true);
            this.markMapGridPosition(mapGrid, nextTileY, previousTileX, true);
            this.markMapGridPosition(mapGrid, nextTileY, nextTileX, true);
        }
        return grid;
    }

    isOccupiedByAnotherCollision(x, y, checkOnLayers, additionalLayers, tileIndexByRowAndColumn)
    {
        if(!checkOnLayers){
            checkOnLayers = additionalLayers;
        }
        let tileIndex = tileIndexByRowAndColumn(y, x);
        for(let layer of checkOnLayers){
            if(0 !== Number(layer.data[tileIndex])){
                return true;
            }
        }
        return false;
    }

    createPathfindingGrid(
        pathFinder,
        mapWidth,
        mapHeight,
        temporalBlockedPositionsToAvoidElements,
        additionalLayers,
        collisionLayersForPaths,
        mapGrid,
        tileIndexByRowAndColumn
    ){
        let debugLayerData = {};
        let grid = pathFinder.create(mapWidth, mapHeight);
        this.unblockTemporalBlockedPoints(temporalBlockedPositionsToAvoidElements, grid, mapGrid);
        for(let layer of additionalLayers){
            let isCollisionsLayer = false;
            for(let collisionLayer of collisionLayersForPaths){
                if(-1 !== layer.name.indexOf(collisionLayer)){
                    isCollisionsLayer = true;
                }
            }
            for(let y = 0; y < mapHeight; y++){
                for(let x = 0; x < mapWidth; x++){
                    let tileIndex = tileIndexByRowAndColumn(y, x);
                    if(!mapGrid[y][x]){
                        grid.setWalkableAt(x, y, false);
                        debugLayerData[tileIndex] = 2;
                        continue;
                    }
                    let tile = layer.data[tileIndex];
                    let isZeroTile = 0 === Number(tile);
                    let isCollisionBody = !isZeroTile && isCollisionsLayer;
                    let hasBody = !isZeroTile && isCollisionBody;
                    if(!hasBody){
                        debugLayerData[tileIndex] = 0;
                        continue;
                    }
                    grid.setWalkableAt(x, y, false);
                    debugLayerData[tileIndex] = 2;
                }
            }
        }
        return {grid, debugLayerData};
    }

}

module.exports.MapGridBuilder = MapGridBuilder;
