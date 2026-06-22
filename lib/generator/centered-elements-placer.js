/**
 *
 * Reldens - CenteredElementsPlacer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class CenteredElementsPlacer
{

    constructor(generator)
    {
        this.generator = generator;
        this.mapLayersComposer = this.generator.mapLayersComposer;
        this.elementsPlacer = this.generator.elementsPlacer;
    }

    async placeCenteredElements()
    {
        if(!this.generator.mapCenteredElements){
            return;
        }
        let elementsKeys = Object.keys(this.generator.mapCenteredElements);
        if(0 === elementsKeys.length){
            return;
        }
        let orderedElements = [];
        for(let i = 0; i < elementsKeys.length; i++){
            let elementKey = elementsKeys[i];
            if(this.generator.layerElements[elementKey]){
                orderedElements.push({
                    key: elementKey,
                    order: this.generator.mapCenteredElements[elementKey]
                });
            }
        }
        if(0 === orderedElements.length){
            return;
        }
        orderedElements.sort((a, b) => a.order - b.order);
        let mapCenterX = Math.floor(this.generator.mapWidth / 2);
        let mapCenterY = Math.floor(this.generator.mapHeight / 2);
        let placementOffsets = this.generator.geometryCalculator.placementOffsets();
        let placedElements = [];
        await this.placeFirstCenteredElement(orderedElements, mapCenterX, mapCenterY, placedElements);
        this.placeRemainingCenteredElements(orderedElements, mapCenterX, mapCenterY, placementOffsets, placedElements);
        this.generator.centerPlacedElements = placedElements;
    }

    async placeFirstCenteredElement(orderedElements, mapCenterX, mapCenterY, placedElements)
    {
        let firstElementKey = orderedElements[0].key;
        if(0 >= this.generator.elementsQuantity[firstElementKey]){
            return;
        }
        let firstElement = this.mapLayersComposer.fetchFirstTilesLayer(this.generator.layerElements[firstElementKey]);
        if(!firstElement){
            Logger.error('First centered element not found: '+firstElementKey);
            return;
        }
        let freeSpaceAround = this.elementsPlacer.determineElementFreeSpaceAround(firstElementKey);
        let posX = mapCenterX - Math.floor(firstElement.width / 2);
        let posY = mapCenterY - Math.floor(firstElement.height / 2);
        let canPlaceFirst = this.canPlaceElementCentered(
            posX,
            posY,
            firstElement.width,
            firstElement.height,
            placedElements
        );
        if(!canPlaceFirst){
            Logger.critical('Could not place first centered element at map center: '+firstElementKey);
            return;
        }
        this.elementsPlacer.placeElementOnMap(firstElementKey, 0, {x: posX, y: posY});
        placedElements.push({
            type: firstElementKey,
            position: {x: posX, y: posY},
            width: firstElement.width,
            height: firstElement.height,
            freeSpaceAround: freeSpaceAround
        });
        this.generator.elementsQuantity[firstElementKey]--;
        await this.generator.debugHelper.debugAdjacentSpots(
            {x: posX, y: posY},
            {width: firstElement.width, height: firstElement.height},
            freeSpaceAround,
            this.generator.mapWidth,
            this.generator.mapHeight
        );
    }

    placeRemainingCenteredElements(orderedElements, mapCenterX, mapCenterY, placementOffsets, placedElements)
    {
        let placement = {mapCenterX, mapCenterY, placementOffsets, placedElements};
        for(let i = 0; i < orderedElements.length; i++){
            let elementKey = orderedElements[i].key;
            let quantity = sc.get(this.generator.elementsQuantity, elementKey, 0);
            if(0 === quantity){
                continue;
            }
            this.placeCenteredElementInstances(elementKey, quantity, placement);
            this.generator.elementsQuantity[elementKey] = 0;
        }
    }

    placeCenteredElementInstances(elementKey, quantity, placement)
    {
        for(let i = 0; i < quantity; i++){
            let element = this.mapLayersComposer.fetchFirstTilesLayer(this.generator.layerElements[elementKey]);
            if(!element){
                Logger.error('Centered element not found: '+elementKey);
                continue;
            }
            let elementFreeSpace = this.elementsPlacer.determineElementFreeSpaceAround(elementKey);
            let placed = this.tryPlaceCenteredElement(elementKey, i, element, elementFreeSpace, placement);
            if(!placed){
                Logger.critical('Could not place centered element: '+elementKey);
            }
        }
    }

    tryPlaceCenteredElement(elementKey, instanceIndex, element, elementFreeSpace, placement)
    {
        let placementOffsets = placement.placementOffsets;
        let placedElements = placement.placedElements;
        let placed = false;
        let multiplyFactor = 1;
        for(let attempts = 0; attempts < placementOffsets.length * 4 && !placed; attempts++){
            if(attempts > 0 && 0 === attempts % placementOffsets.length){
                multiplyFactor++;
            }
            let offset = placementOffsets[attempts % placementOffsets.length];
            let offsetX = offset.x * (element.width + elementFreeSpace * 2) * multiplyFactor;
            let offsetY = offset.y * (element.height + elementFreeSpace * 2) * multiplyFactor;
            let posX = placement.mapCenterX - Math.floor(element.width / 2) + offsetX;
            let posY = placement.mapCenterY - Math.floor(element.height / 2) + offsetY;
            if(this.canPlaceElementCentered(posX, posY, element.width, element.height, placedElements)){
                this.elementsPlacer.placeElementOnMap(elementKey, instanceIndex, {x: posX, y: posY});
                placedElements.push({
                    type: elementKey,
                    position: {x: posX, y: posY},
                    width: element.width,
                    height: element.height,
                    freeSpaceAround: elementFreeSpace
                });
                placed = true;
            }
        }
        return placed;
    }

    canPlaceElementCentered(x, y, width, height, placedElements)
    {
        if(0 > x || 0 > y || x + width > this.generator.mapWidth || y + height > this.generator.mapHeight){
            return false;
        }
        for(let element of placedElements){
            let freeSpace = Math.max(
                sc.get(element, 'freeSpaceAround', 0),
                this.elementsPlacer.calculateMinimumFreeSpace()
            );
            let rectA = {x, y, width, height};
            let rectB = {
                x: element.position.x,
                y: element.position.y,
                width: element.width,
                height: element.height
            };
            if(this.generator.geometryCalculator.rectsOverlap(rectA, rectB, freeSpace)){
                return false;
            }
        }
        return this.generator.geometryCalculator.isFootprintWalkable(this.generator.mapGrid, x, y, width, height);
    }

}

module.exports.CenteredElementsPlacer = CenteredElementsPlacer;
