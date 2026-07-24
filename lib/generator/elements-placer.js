/**
 *
 * Reldens - ElementsPlacer
 *
 */

const { PlacementFeasibility } = require('./placement-feasibility');
const { Logger, sc } = require('@reldens/utils');

class ElementsPlacer
{

    constructor(generator)
    {
        this.generator = generator;
        this.mapLayersComposer = this.generator.mapLayersComposer;
        this.feasibility = new PlacementFeasibility(generator);
    }

    async placeElements()
    {
        this.generateAdditionalLayers();
        this.prePlaceStairs();
        this.feasibility.buildPending();
        await this.generator.centeredElementsPlacer.placeCenteredElements();
        let loopElementsQuantity = !this.generator.orderElementsBySize
            ? this.generator.elementsQuantity
            : this.sortedElementsQuantity();
        let randomizedElementsQuantity = [];
        for(let elementType of Object.keys(loopElementsQuantity)){
            for(let index = 0; index < loopElementsQuantity[elementType]; index++){
                if(!this.generator.randomizeQuantities){
                    this.placeElementOnMap(elementType, index);
                    continue;
                }
                randomizedElementsQuantity.push(elementType);
            }
        }
        randomizedElementsQuantity = sc.shuffleArray(randomizedElementsQuantity);
        if(this.generator.randomizeQuantities){
            let index = 0;
            for(let elementType of randomizedElementsQuantity){
                this.placeElementOnMap(elementType, index);
                index++;
            }
        }
        this.processPendingElements();
        this.generator.additionalLayers = this.generator.additionalLayers.filter(
            layer => layer.data.some(tile => 0 !== tile)
        );
    }

    generateAdditionalLayers()
    {
        let addedLayerNames = new Set();
        let elementTypes = Object.keys(this.generator.layerElements);
        for(let elementType of elementTypes){
            for(let layer of this.generator.layerElements[elementType]){
                if(!layer.visible){
                    Logger.warning('Layer "'+layer.name+'" not visible.');
                    continue;
                }
                if(addedLayerNames.has(layer.name)){
                    continue;
                }
                this.generator.additionalLayers.push(
                    this.generator.generateLayerWithData(
                        layer.name,
                        Array(this.generator.mapWidth * this.generator.mapHeight).fill(0)
                    )
                );
                addedLayerNames.add(layer.name);
            }
        }
    }

    prePlaceStairs()
    {
        let hasStairsUp = 0 < this.generator.elementsQuantity['stairs-up'];
        let hasStairsDown = 0 < this.generator.elementsQuantity['stairs-down'];
        let previousFloorData = this.generator.previousFloorData;
        if(
            !sc.hasOwn(previousFloorData, 'floorKey')
            || (!previousFloorData['stairs-up'] && !previousFloorData['stairs-down'])
            || (!hasStairsUp && !hasStairsDown)
        ){
            return;
        }
        if(hasStairsUp && previousFloorData['stairs-down'] && 'down' === previousFloorData['floorKey']){
            this.placeElementOnMap('stairs-up', 0, previousFloorData['stairs-down']);
            delete this.generator.elementsQuantity['stairs-up'];
        }
        if(hasStairsDown && previousFloorData['stairs-up'] && 'upper' === previousFloorData['floorKey']){
            this.placeElementOnMap('stairs-down', 0, previousFloorData['stairs-up']);
            delete this.generator.elementsQuantity['stairs-down'];
        }
    }

    placeElementOnMap(elementType, elementNumber, position = false)
    {
        let elementLayersDataArray = this.generator.layerElements[elementType];
        if(!elementLayersDataArray){
            Logger.debug('No layers found for element "'+elementType+'".');
            return;
        }
        let baseElementData = this.fetchBaseElementData(elementType);
        if(!baseElementData){
            Logger.error('Base element data not found for element "'+elementType+'".');
            return;
        }
        Logger.debug({elementType, elementNumber, ...baseElementData});
        if(!position){
            position = this.findValidatedPosition(elementType, baseElementData);
        }
        if(!position){
            if(!this.generator.placementRejectResolver.resolve(elementType, elementNumber)){
                Logger.warning(
                    'Position not found for element "'+elementType+'" in map "'+this.generator.mapName+'".'
                );
            }
            return;
        }
        if('stairs-up' === elementType || 'stairs-down' === elementType){
            this.generator.generatedFloorData[elementType] = position;
        }
        for(let elementLayer of elementLayersDataArray){
            if('tilelayer' !== elementLayer.type){
                continue;
            }
            if(!elementLayer.visible){
                Logger.warning('Layer "'+elementLayer.name+'" not visible.');
                continue;
            }
            elementLayer.position = position;
            Logger.debug('Place element "'+elementType+'".', position, elementLayer.name);
            this.generator.elementLayerWriter.updateLayerData(
                elementLayer,
                elementNumber,
                baseElementData,
                elementType
            );
        }
        this.recordPlacedElement(elementType, elementNumber, position, baseElementData, elementLayersDataArray);
        this.feasibility.consume(elementType, elementNumber);
    }

    fetchBaseElementData(elementType)
    {
        let elementLayersDataArray = this.generator.layerElements[elementType];
        if(!elementLayersDataArray){
            return null;
        }
        let baseElementData = this.mapLayersComposer.fetchFirstTilesLayer(elementLayersDataArray);
        if(!baseElementData){
            return null;
        }
        baseElementData.freeSpaceAround = this.determineElementFreeSpaceAround(elementType);
        baseElementData.allowPathsInFreeSpace = this.determineElementAllowPathsInFreeSpace(elementType);
        return baseElementData;
    }

    findFootprintOnlyPosition(baseElementData)
    {
        return this.generator.positionFinder.findNextAvailablePosition(
            baseElementData.width + baseElementData.freeSpaceAround * this.generator.requiredForBothSidesDuplicator,
            baseElementData.height + baseElementData.freeSpaceAround * this.generator.requiredForBothSidesDuplicator,
            this.generator.mapWidth,
            this.generator.mapHeight,
            this.generator.mapGrid,
            null
        );
    }

    processPendingElements()
    {
        for(let pass = 0; pass < 10; pass++){
            if(this.placePendingElementsBatch()){
                return;
            }
        }
        let leftOver = this.feasibility.collectPendingElements();
        if(0 < leftOver.length){
            Logger.critical('Moved elements could not be re-placed on the map.', leftOver);
        }
    }

    placePendingElementsBatch()
    {
        let pendingElementPlaceholders = this.feasibility.collectPendingElements();
        if(0 === pendingElementPlaceholders.length){
            return true;
        }
        for(let entry of pendingElementPlaceholders){
            this.placeElementOnMap(entry.elementType, entry.elementNumber);
        }
        return false;
    }

    recordPlacedElement(elementType, elementNumber, position, baseElementData, elementLayersDataArray)
    {
        let layerNames = [];
        let hasFixedPointsLayer = false;
        for(let elementLayer of elementLayersDataArray){
            if('tilelayer' !== elementLayer.type){
                continue;
            }
            if(!elementLayer.visible){
                continue;
            }
            let layerName = this.generator.elementLayerName.build(elementType, elementNumber, elementLayer.name);
            layerNames.push(layerName);
            if(-1 !== layerName.indexOf('change-points') || -1 !== layerName.indexOf('return-point')){
                hasFixedPointsLayer = true;
            }
        }
        let isStairsElement = 'stairs-up' === elementType || 'stairs-down' === elementType;
        this.generator.placedElementsJournal.push({
            elementType,
            elementNumber,
            position: {x: position.x, y: position.y},
            width: baseElementData.width,
            height: baseElementData.height,
            freeSpaceAround: baseElementData.freeSpaceAround,
            allowPathsInFreeSpace: baseElementData.allowPathsInFreeSpace,
            movable: !hasFixedPointsLayer && !isStairsElement,
            layerNames
        });
    }

    findValidatedPosition(elementType, baseElementData)
    {
        let freeSpaceAround = baseElementData.freeSpaceAround;
        let expandedWidth = baseElementData.width + freeSpaceAround * this.generator.requiredForBothSidesDuplicator;
        let expandedHeight = baseElementData.height + freeSpaceAround * this.generator.requiredForBothSidesDuplicator;
        let validator = this.feasibility.buildValidator(elementType, expandedWidth, expandedHeight, 0);
        if(false === validator){
            return null;
        }
        return this.generator.positionFinder.findPosition(
            expandedWidth,
            expandedHeight,
            this.generator.mapWidth,
            this.generator.mapHeight,
            this.generator.mapGrid,
            validator
        );
    }

    sortedElementsQuantity()
    {
        let elementsWithArea = Object.keys(this.generator.elementsQuantity).map(key => {
            let area = 0;
            if(this.generator.layerElements[key] && 0 < this.generator.layerElements[key].length){
                let layerData = this.mapLayersComposer.fetchFirstTilesLayer(this.generator.layerElements[key]);
                area = layerData.height * layerData.width;
            }
            return {key, area, quantity: this.generator.elementsQuantity[key]};
        });
        elementsWithArea.sort((a, b) => b.area - a.area);
        let sorted = {};
        for(let element of elementsWithArea){
            sorted[element.key] = element.quantity;
        }
        return sorted;
    }

    determineElementFreeSpaceAround(elementType, elementsFreeSpaceAround)
    {
        let minimumFreeSpace = this.calculateMinimumFreeSpace();
        if(!sc.isObject(elementsFreeSpaceAround)){
            if(!sc.isObject(this.generator.elementsFreeSpaceAround)){
                return minimumFreeSpace;
            }
            elementsFreeSpaceAround = this.generator.elementsFreeSpaceAround;
        }
        return sc.get(elementsFreeSpaceAround, elementType, minimumFreeSpace);
    }

    calculateMinimumFreeSpace()
    {
        let minimumElementsFreeSpaceAround = this.generator.minimumElementsFreeSpaceAround;
        if(1 < this.generator.pathSize){
            return Math.max(minimumElementsFreeSpaceAround, this.generator.pathSize);
        }
        return minimumElementsFreeSpaceAround;
    }

    determineElementAllowPathsInFreeSpace(elementType, allowPathsInFreeSpace)
    {
        let defaultElementsAllowPathsInFreeSpace = this.generator.defaultElementsAllowPathsInFreeSpace;
        if(!sc.isObject(allowPathsInFreeSpace)){
            allowPathsInFreeSpace = Object.assign(
                this.generator.elementsAllowPathsInFreeSpace,
                sc.get(this.generator.elementsProvider, 'allowPathsInFreeSpace', {})
            );
        }
        return sc.get(allowPathsInFreeSpace, elementType, defaultElementsAllowPathsInFreeSpace);
    }

}

module.exports.ElementsPlacer = ElementsPlacer;
