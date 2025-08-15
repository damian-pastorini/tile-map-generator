/**
 *
 * Reldens - MapGridBuilder
 *
 */

const { Logger, sc } = require('@reldens/utils');

class MapGridBuilder
{

    constructor(generator)
    {
        this.layerElements = generator.layerElements;
        this.elementsQuantity = generator.elementsQuantity;
        this.freeSpaceTilesQuantity = generator.freeSpaceTilesQuantity;
        this.freeSpaceMultiplier = generator.freeSpaceMultiplier;
        this.freeTilesMultiplier = generator.freeTilesMultiplier;
        this.minimumDistanceFromBorders = generator.minimumDistanceFromBorders;
        this.blockMapBorder = generator.blockMapBorder;
        this.fetchFirstTilesLayer = generator.fetchFirstTilesLayer.bind(generator);
        this.determineElementFreeSpaceAround = generator.determineElementFreeSpaceAround.bind(generator);
        this.tileIndexByRowAndColumn = generator.tileIndexByRowAndColumn.bind(generator);
    }

    generateEmptyMap(mapSize, groundTile)
    {
        let {mapWidth, mapHeight} = this.setMapSize(mapSize);
        let mapGrid = Array.from({length: mapHeight}, () => Array(mapWidth).fill(true));
        let groundLayerData = null;
        if(0 !== groundTile){
            // @TODO - BETA - If 0 < this.groundTiles.length then fill with random this.groundTiles.
            groundLayerData = Array(mapWidth * mapHeight).fill(groundTile);
        }
        return {mapGrid, groundLayerData, mapWidth, mapHeight};
    }

    setMapSize(mapSize)
    {
        if(0 < mapSize.mapWidth && 0 < mapSize.mapHeight){
            return {mapWidth: mapSize.mapWidth, mapHeight: mapSize.mapHeight};
        }
        return this.calculateMapSizeWithFreeSpace();
    }

    calculateMapSizeWithFreeSpace()
    {
        if(!this.layerElements){
            Logger.error('No layer elements defined.');
            return false;
        }
        if(!sc.isObject(this.elementsQuantity) || 0 === Object.keys(this.elementsQuantity).length){
            Logger.error('No layer elements quantity defined.');
            return false;
        }
        let totalArea = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        for(let elementType of Object.keys(this.elementsQuantity)){
            if(!this.layerElements[elementType]){
                Logger.debug('No layer elements defined for element "'+elementType+'".');
                continue;
            }
            let element = this.fetchFirstTilesLayer(this.layerElements[elementType]);
            if(!element){
                Logger.error('Element "tilelayer" not found: ' + elementType);
                continue;
            }
            let quantity = this.elementsQuantity[elementType];
            let freeSpaceAround = this.determineElementFreeSpaceAround(elementType);
            let freeSpaceUpDownLeftRight = freeSpaceAround * this.freeSpaceMultiplier;
            let freeTilesUpDownLeftRight = this.freeSpaceTilesQuantity * this.freeTilesMultiplier;
            let widthPlusFreeTiles = element.width + freeTilesUpDownLeftRight + freeSpaceUpDownLeftRight;
            let heightPlusFreeTiles = element.height + freeTilesUpDownLeftRight + freeSpaceUpDownLeftRight;
            let elementArea = widthPlusFreeTiles * heightPlusFreeTiles * quantity;
            totalArea += elementArea;
            maxWidth = Math.max(maxWidth, widthPlusFreeTiles);
            maxHeight = Math.max(maxHeight, heightPlusFreeTiles);
        }
        let baseSize = Math.ceil(Math.sqrt(totalArea));
        baseSize = Math.max(baseSize, maxWidth, maxHeight);
        let mapWidth = baseSize + (this.minimumDistanceFromBorders * 2);
        let mapHeight = baseSize + (this.minimumDistanceFromBorders * 2);
        if(this.blockMapBorder){
            mapWidth++;
            mapHeight++;
        }
        return { mapWidth, mapHeight };
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

    isOccupiedByAnotherCollision(x, y, checkOnLayers, additionalLayers)
    {
        if(!checkOnLayers){
            checkOnLayers = additionalLayers;
        }
        let tileIndex = this.tileIndexByRowAndColumn(y, x);
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
        mapGrid
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
                    let tileIndex = this.tileIndexByRowAndColumn(y, x);
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
