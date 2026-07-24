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
        this.generator = generator;
        this.mapLayersComposer = this.generator.mapLayersComposer;
        this.elementsPlacer = this.generator.elementsPlacer;
        this.tilePositionCalculator = this.generator.tilePositionCalculator;
        this.layerElements = generator.layerElements;
        this.elementsQuantity = generator.elementsQuantity;
        this.freeSpaceTilesQuantity = generator.freeSpaceTilesQuantity;
        this.freeSpaceMultiplier = generator.freeSpaceMultiplier;
        this.freeTilesMultiplier = generator.freeTilesMultiplier;
        this.mapSizeFreeSpaceSidesMultiplier = generator.mapSizeFreeSpaceSidesMultiplier;
        this.minimumDistanceFromBorders = generator.minimumDistanceFromBorders;
        this.blockMapBorder = generator.blockMapBorder;
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
            let element = this.mapLayersComposer.fetchFirstTilesLayer(this.layerElements[elementType]);
            if(!element){
                Logger.error('Element "tilelayer" not found: ' + elementType);
                continue;
            }
            let quantity = this.elementsQuantity[elementType];
            let freeSpaceAround = this.elementsPlacer.determineElementFreeSpaceAround(elementType);
            let freeSpaceUpDownLeftRight = freeSpaceAround * this.freeSpaceMultiplier;
            let freeTilesUpDownLeftRight = this.freeSpaceTilesQuantity * this.freeTilesMultiplier;
            let freeSpaceCalculated = (freeTilesUpDownLeftRight + freeSpaceUpDownLeftRight)
                * this.mapSizeFreeSpaceSidesMultiplier;
            let widthPlusFreeTiles = element.width + freeSpaceCalculated;
            let heightPlusFreeTiles = element.height + freeSpaceCalculated;
            let elementArea = widthPlusFreeTiles * heightPlusFreeTiles * quantity;
            totalArea += elementArea;
            maxWidth = Math.max(maxWidth, widthPlusFreeTiles);
            maxHeight = Math.max(maxHeight, heightPlusFreeTiles);
        }
        let spotsForSizing = this.generator && this.generator.groundSpots ? this.generator.groundSpots : {};
        for(let spotKey of Object.keys(spotsForSizing)){
            let spotConfig = spotsForSizing[spotKey];
            if(sc.get(spotConfig, 'isElement', false)){
                continue;
            }
            let quantity = Number(sc.get(spotConfig, 'quantity', 1));
            let spotWidth = sc.get(spotConfig, 'width', 0);
            let spotHeight = sc.get(spotConfig, 'height', 0);
            totalArea += spotWidth * spotHeight * quantity;
            maxWidth = Math.max(maxWidth, spotWidth);
            maxHeight = Math.max(maxHeight, spotHeight);
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

    rebuildGridFromJournal()
    {
        let generator = this.generator;
        let mapGrid = [];
        for(let rowIndex = 0; rowIndex < generator.mapHeight; rowIndex++){
            mapGrid.push(new Array(generator.mapWidth).fill(true));
        }
        generator.mapGrid = mapGrid;
        generator.temporalBlockedPositionsToAvoidElements = [];
        generator.temporalBlockedPositionsToAvoidElementsList = [];
        if(generator.blockMapBorder && !generator.isBorderWalkable){
            this.markBorderAsNotWalkable(mapGrid, generator.mapWidth, generator.mapHeight);
        }
        this.reapplyJournalEntriesOnGrid();
        generator.mapBorderGenerator.reapplyEntryPositionWalkability();
    }

    reapplyJournalEntriesOnGrid()
    {
        for(let entry of this.generator.placedElementsJournal){
            this.markJournalEntryOnGrid(entry);
        }
    }

    markJournalEntryOnGrid(entry)
    {
        for(let row = 0; row < entry.height; row++){
            this.markJournalEntryRowOnGrid(entry, row);
        }
    }

    markJournalEntryRowOnGrid(entry, row)
    {
        for(let column = 0; column < entry.width; column++){
            let gridY = entry.position.y + row;
            let gridX = entry.position.x + column;
            this.generator.elementLayerWriter.markFreeSpaceAroundElementAsNotAvailable(
                entry.freeSpaceAround,
                gridY,
                gridX,
                entry.elementType,
                entry.allowPathsInFreeSpace
            );
            this.markMapGridPosition(this.generator.mapGrid, gridY, gridX, false);
        }
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
        for(let column = 0; column < mapWidth; column++){
            mapGrid[0][column] = false;
            mapGrid[mapHeight - 1][column] = false;
        }
        for(let row = 0; row < mapHeight; row++){
            mapGrid[row][0] = false;
            mapGrid[row][mapWidth - 1] = false;
        }
    }

    unblockTemporalBlockedPoints(temporalBlockedPositionsToAvoidElements, mapGrid)
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
    }

    isOccupiedByAnotherCollision(x, y, checkOnLayers, additionalLayers)
    {
        if(!checkOnLayers){
            checkOnLayers = additionalLayers;
        }
        let tileIndex = this.tilePositionCalculator.tileIndexByRowAndColumn(y, x);
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
        this.unblockTemporalBlockedPoints(temporalBlockedPositionsToAvoidElements, mapGrid);
        for(let layer of additionalLayers){
            let isCollisionsLayer = false;
            for(let collisionLayer of collisionLayersForPaths){
                if(-1 !== layer.name.indexOf(collisionLayer)){
                    isCollisionsLayer = true;
                }
            }
            this.generator.layerDataFactory.forEachMapCell(mapWidth, mapHeight, (x, y) => {
                let tileIndex = this.tilePositionCalculator.tileIndexByRowAndColumn(y, x);
                if(!mapGrid[y][x]){
                    grid.setWalkableAt(x, y, false);
                    debugLayerData[tileIndex] = 2;
                    return;
                }
                let tile = layer.data[tileIndex];
                let isZeroTile = 0 === Number(tile);
                let isCollisionBody = !isZeroTile && isCollisionsLayer;
                let hasBody = !isZeroTile && isCollisionBody;
                if(!hasBody){
                    debugLayerData[tileIndex] = 0;
                    return;
                }
                grid.setWalkableAt(x, y, false);
                debugLayerData[tileIndex] = 2;
            });
        }
        return {grid, debugLayerData};
    }

}

module.exports.MapGridBuilder = MapGridBuilder;
