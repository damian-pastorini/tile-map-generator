/**
 *
 * Reldens - PlacementRejectResolver
 *
 */

const { Logger } = require('@reldens/utils');

class PlacementRejectResolver
{

    constructor(generator)
    {
        this.generator = generator;
        this.resolving = false;
        this.maxMoveAttempts = 10;
    }

    resolve(elementType, elementNumber)
    {
        let baseElementData = this.generator.elementsPlacer.fetchBaseElementData(elementType);
        if(!baseElementData){
            return false;
        }
        if(this.resolving){
            return this.resolveByGrowingMap(elementType, elementNumber, baseElementData);
        }
        this.resolving = true;
        let result = this.runResolvers(elementType, elementNumber, baseElementData);
        this.resolving = false;
        return result;
    }

    runResolvers(elementType, elementNumber, baseElementData)
    {
        if('moveElements' === this.generator.placeRejectResolver){
            if(this.resolveByMovingElements(elementType, elementNumber, baseElementData)){
                return true;
            }
            Logger.critical(
                'Placement rejection for "'+elementType+'" could not be resolved by moving elements, using auto grow.'
            );
        }
        return this.resolveByGrowingMap(elementType, elementNumber, baseElementData);
    }

    resolveByMovingElements(elementType, elementNumber, baseElementData)
    {
        for(let attempt = 0; attempt < this.maxMoveAttempts; attempt++){
            let removedEntry = this.removeMostRecentMovable();
            if(!removedEntry){
                return false;
            }
            let position = this.generator.elementsPlacer.findValidatedPosition(elementType, baseElementData);
            if(!position){
                continue;
            }
            this.generator.elementsPlacer.placeElementOnMap(elementType, elementNumber, position);
            Logger.info('Placement rejection for "'+elementType+'" resolved by moving elements.');
            return true;
        }
        return false;
    }

    removeMostRecentMovable()
    {
        let journal = this.generator.placedElementsJournal;
        for(let index = journal.length - 1; 0 <= index; index--){
            if(!journal[index].movable){
                continue;
            }
            let entry = journal.splice(index, 1)[0];
            this.clearPlacedElementTiles(entry);
            this.generator.elementsPlacer.feasibility.queueMovedElement(entry);
            this.generator.mapGridBuilder.rebuildGridFromJournal();
            Logger.info('Removed element "'+entry.elementType+'" to make space for a rejected placement.');
            return entry;
        }
        return null;
    }

    clearPlacedElementTiles(entry)
    {
        for(let layerName of entry.layerNames){
            this.clearElementTilesFromLayer(entry, this.findLayerByName(layerName));
        }
    }

    clearElementTilesFromLayer(entry, layer)
    {
        if(!layer){
            return;
        }
        for(let row = 0; row < entry.height; row++){
            this.clearElementTilesRow(entry, layer, row);
        }
    }

    clearElementTilesRow(entry, layer, row)
    {
        for(let column = 0; column < entry.width; column++){
            layer.data[(entry.position.y + row) * this.generator.mapWidth + entry.position.x + column] = 0;
        }
    }

    findLayerByName(layerName)
    {
        for(let layer of this.generator.additionalLayers){
            if(layerName === layer.name){
                return layer;
            }
        }
        return null;
    }

    resolveByGrowingMap(elementType, elementNumber, baseElementData)
    {
        let growBy = baseElementData.height
            + baseElementData.freeSpaceAround * this.generator.requiredForBothSidesDuplicator
            + this.generator.minimumDistanceFromBorders * 2
            + (this.generator.blockMapBorder ? 1 : 0);
        this.growMapBottom(growBy);
        let position = this.generator.elementsPlacer.findValidatedPosition(elementType, baseElementData);
        if(!position){
            position = this.generator.elementsPlacer.findFootprintOnlyPosition(baseElementData);
        }
        if(!position){
            Logger.critical('Auto grow could not resolve the placement for element "'+elementType+'".');
            return false;
        }
        this.generator.elementsPlacer.placeElementOnMap(elementType, elementNumber, position);
        Logger.info('Map auto grown by '+growBy+' rows to place the element "'+elementType+'".');
        return true;
    }

    growMapBottom(growBy)
    {
        let generator = this.generator;
        let oldHeight = generator.mapHeight;
        for(let rowIndex = 0; rowIndex < growBy; rowIndex++){
            generator.mapGrid.push(new Array(generator.mapWidth).fill(true));
        }
        generator.mapHeight = oldHeight + growBy;
        this.unblockOldBottomBorderRow(oldHeight);
        generator.layerDataFactory.appendLayerRows(
            generator.groundLayerData,
            generator.mapWidth,
            growBy,
            generator.groundTile
        );
        generator.layerDataFactory.appendLayerRows(generator.pathLayerData, generator.mapWidth, growBy, 0);
        for(let layer of generator.additionalLayers){
            generator.layerDataFactory.appendLayerRows(layer.data, generator.mapWidth, growBy, 0);
            layer.height = generator.mapHeight;
        }
        generator.mapBorderGenerator.redrawBorderForGrownMap();
        if('' !== generator.entryPosition){
            Logger.critical('Auto grow keeps the entry position, set an explicit mapSize when using entry positions.');
        }
    }

    unblockOldBottomBorderRow(oldHeight)
    {
        if(!this.generator.blockMapBorder || this.generator.isBorderWalkable){
            return;
        }
        for(let columnIndex = 0; columnIndex < this.generator.mapWidth; columnIndex++){
            this.generator.mapGridBuilder.markMapGridPosition(this.generator.mapGrid, oldHeight - 1, columnIndex, true);
        }
    }

}

module.exports.PlacementRejectResolver = PlacementRejectResolver;
