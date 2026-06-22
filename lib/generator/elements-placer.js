/**
 *
 * Reldens - ElementsPlacer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ElementsPlacer
{

    constructor(generator)
    {
        this.generator = generator;
        this.mapLayersComposer = this.generator.mapLayersComposer;
    }

    async placeElements()
    {
        this.generateAdditionalLayers();
        this.prePlaceStairs();
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
        let baseElementData = this.mapLayersComposer.fetchFirstTilesLayer(elementLayersDataArray);
        baseElementData.freeSpaceAround = this.determineElementFreeSpaceAround(elementType);
        baseElementData.allowPathsInFreeSpace = this.determineElementAllowPathsInFreeSpace(elementType);
        Logger.debug({elementType, elementNumber, ...baseElementData});
        if(!position){
            let elementWithFreeSpaceWidth = baseElementData.width + baseElementData.freeSpaceAround * 2;
            let elementWithFreeSpaceHeight = baseElementData.height + baseElementData.freeSpaceAround * 2;
            position = this.generator.positionFinder.findPosition(
                elementWithFreeSpaceWidth,
                elementWithFreeSpaceHeight,
                this.generator.mapWidth,
                this.generator.mapHeight,
                this.generator.mapGrid
            );
        }
        if(!position){
            Logger.warning(
                'Position not found for element "'+elementType+'" in map "'+this.generator.mapName+'".'
            );
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
