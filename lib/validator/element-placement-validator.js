/**
 *
 * Reldens - Tile Map Generator - ElementPlacementValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { DistanceCalculator } = require('../utilities/distance-calculator');
const { Logger, sc } = require('@reldens/utils');

class ElementPlacementValidator extends MapValidator
{

    constructor()
    {
        super();
        this.distanceCalculator = new DistanceCalculator();
    }

    performValidation(map, config, options)
    {
        let quantityValidation = this.validateElementQuantities(map, config);
        this.logValidationResult('Element Quantity Validation', quantityValidation);
        if(!quantityValidation.isValid){
            return false;
        }
        let positionValidation = this.validateElementPositions(map, config);
        this.logValidationResult('Element Position Validation', positionValidation);
        if(!positionValidation.isValid){
            return false;
        }
        let boundaryValidation = this.validateElementBoundaries(map, config);
        this.logValidationResult('Element Boundary Validation', boundaryValidation);
        if(!boundaryValidation.isValid){
            return false;
        }
        let overlapValidation = this.validateElementOverlaps(map, config);
        this.logValidationResult('Element Overlap Validation', overlapValidation);
        return overlapValidation.isValid;
    }

    validateElementQuantities(map, config, generator = null)
    {
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let elementTypes = Object.keys(elementsQuantity);
        if(0 === elementTypes.length){
            return {isValid: true, reason: 'No elements configured'};
        }
        let validation = {
            isValid: true,
            totalExpected: 0,
            totalActual: 0,
            accuracyPercentage: 100,
            elementResults: {}
        };
        if(generator){
            Logger.debug('Map file path:', generator.mapFileFullPath || 'not available.');
        }
        for(let elementType of elementTypes){
            let expectedCount = elementsQuantity[elementType];
            let actualCount = this.countElementInstancesInMap(map, config, elementType);
            Logger.debug('Element', elementType, '- Expected:', expectedCount, 'Actual:', actualCount);
            validation.totalExpected += expectedCount;
            validation.totalActual += actualCount;
            let isMatch = expectedCount === actualCount;
            validation.elementResults[elementType] = {
                expected: expectedCount,
                actual: actualCount,
                match: isMatch,
                accuracy: 0 === expectedCount ? 100 : (Math.min(actualCount, expectedCount) / expectedCount) * 100
            };
            if(!isMatch){
                validation.isValid = false;
                this.logValidationError(
                    'Element quantity mismatch for '+elementType+': expected '+expectedCount+', actual '+actualCount
                );
            }
        }
        validation.accuracyPercentage = 0 === validation.totalExpected
            ? 100
            : (Math.min(validation.totalActual, validation.totalExpected) / validation.totalExpected) * 100;
        return validation;
    }

    countElementInstancesInMap(map, config, elementType)
    {
        let layerElements = sc.get(config, 'layerElements', {});
        let elementConfig = sc.get(layerElements, elementType, []);
        if(0 === elementConfig.length){
            return 0;
        }
        let elementLayers = elementConfig.filter(layer => 'tilelayer' === layer.type);
        if(0 === elementLayers.length){
            return 0;
        }
        let elementWidth = elementLayers[0].width;
        let elementHeight = elementLayers[0].height;
        let mapLayers = sc.get(map, 'layers', []);
        let mapWidth = sc.get(map, 'width', 0);
        let mapHeight = sc.get(map, 'height', 0);
        Logger.debug('Element layers:', elementLayers.map(l => l.name));
        Logger.debug('Map layer names:', mapLayers.map(l => l.name));
        let count = 0;
        let foundPositions = [];
        for(let y = 0; y <= mapHeight - elementHeight; y++){
            for(let x = 0; x <= mapWidth - elementWidth; x++){
                if(this.positionOverlapsFound(x, y, elementWidth, elementHeight, foundPositions)){
                    continue;
                }
                let allMatch = true;
                let matchedLayers = 0;
                for(let elementLayer of elementLayers){
                    let mapLayer = mapLayers.find(l => l.name === elementLayer.name);
                    if(!mapLayer){
                        allMatch = false;
                        break;
                    }
                    if(!this.doesPatternMatch(
                        mapLayer.data,
                        mapWidth,
                        elementLayer.data,
                        elementWidth,
                        elementHeight,
                        x,
                        y
                    )){
                        allMatch = false;
                        break;
                    }
                    matchedLayers++;
                }
                if(allMatch){
                    Logger.debug('Found element at:', x, y, 'matched layers:', matchedLayers);
                    foundPositions.push({x, y});
                    count++;
                }
            }
        }
        Logger.debug('Total count for', elementType, ':', count);
        return count;
    }

    positionOverlapsFound(x, y, width, height, foundPositions)
    {
        for(let pos of foundPositions){
            if(!(x >= pos.x + width || pos.x >= x + width || y >= pos.y + height || pos.y >= y + height)){
                return true;
            }
        }
        return false;
    }

    doesPatternMatch(mapData, mapWidth, elementData, elementWidth, elementHeight, startX, startY)
    {
        for(let y = 0; y < elementHeight; y++){
            for(let x = 0; x < elementWidth; x++){
                let elementIndex = y * elementWidth + x;
                let mapIndex = (startY + y) * mapWidth + (startX + x);
                let elementTile = elementData[elementIndex];
                let mapTile = mapData[mapIndex];
                if(0 === elementTile){
                    continue;
                }
                if(elementTile !== mapTile){
                    return false;
                }
            }
        }
        return true;
    }

    validateElementPositions(map, config)
    {
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let layerElements = sc.get(config, 'layerElements', {});
        let validation = {
            isValid: true,
            totalElements: 0,
            validPositions: 0,
            invalidPositions: 0,
            positionResults: {}
        };
        for(let elementType of Object.keys(elementsQuantity)){
            let elementConfig = sc.get(layerElements, elementType, []);
            let elementData = this.extractElementDimensions(elementConfig);
            if(!elementData){
                this.logValidationWarning('No element data found for '+elementType);
                continue;
            }
            let elementPositions = this.findElementPositionsInMap(map, elementType);
            validation.totalElements += elementPositions.length;
            let positionValidation = this.validatePositionsForElement(elementPositions, elementData, map);
            validation.validPositions += positionValidation.validCount;
            validation.invalidPositions += positionValidation.invalidCount;
            validation.positionResults[elementType] = positionValidation;
            if(!positionValidation.isValid){
                validation.isValid = false;
            }
        }
        return validation;
    }

    extractElementDimensions(elementConfig)
    {
        if(!sc.isArray(elementConfig)){
            return null;
        }
        for(let layer of elementConfig){
            if('tilelayer' === sc.get(layer, 'type')){
                return {
                    width: sc.get(layer, 'width', 1),
                    height: sc.get(layer, 'height', 1),
                    layer
                };
            }
        }
        return null;
    }

    findElementPositionsInMap(map, elementType)
    {
        let layers = sc.get(map, 'layers', []);
        let positions = [];
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(-1 === layerName.indexOf(elementType)){
                continue;
            }
            let elementPosition = this.detectElementPositionInLayer(layer, map);
            if(elementPosition){
                positions.push({
                    ...elementPosition,
                    elementType,
                    layerName
                });
            }
        }
        return positions;
    }

    detectElementPositionInLayer(layer, map)
    {
        let layerData = sc.get(layer, 'data', []);
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let nonZeroPositions = this.findTilePositions(layerData, width, height, tile => 0 !== tile);
        if(0 === nonZeroPositions.length){
            return null;
        }
        let boundingBox = this.distanceCalculator.calculateBoundingBox(nonZeroPositions);
        return {
            x: boundingBox.minX,
            y: boundingBox.minY,
            width: boundingBox.width,
            height: boundingBox.height,
            tilePositions: nonZeroPositions
        };
    }

    validatePositionsForElement(elementPositions, elementData, map)
    {
        let validation = {
            isValid: true,
            validCount: 0,
            invalidCount: 0,
            violations: []
        };
        for(let position of elementPositions){
            let positionValidation = this.validateSingleElementPosition(position, elementData, map);
            if(positionValidation.isValid){
                validation.validCount++;
                continue;
            }
            validation.invalidCount++;
            validation.violations.push(positionValidation);
            validation.isValid = false;
        }
        return validation;
    }

    validateSingleElementPosition(position, elementData, map)
    {
        let violations = [];
        let expectedWidth = elementData.width;
        let expectedHeight = elementData.height;
        if(position.width !== expectedWidth){
            violations.push('Width mismatch: expected '+expectedWidth+', actual '+position.width);
        }
        if(position.height !== expectedHeight){
            violations.push('Height mismatch: expected '+expectedHeight+', actual '+position.height);
        }
        let tileCount = position.tilePositions.length;
        let expectedTileCount = expectedWidth * expectedHeight;
        if(tileCount !== expectedTileCount){
            violations.push('Tile count mismatch: expected '+expectedTileCount+', actual '+tileCount);
        }
        return {
            isValid: 0 === violations.length,
            position,
            violations,
            elementData
        };
    }

    validateElementBoundaries(map, config)
    {
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let layerElements = sc.get(config, 'layerElements', {});
        let validation = {
            isValid: true,
            totalElements: 0,
            withinBoundaries: 0,
            outsideBoundaries: 0,
            violations: []
        };
        for(let elementType of Object.keys(elementsQuantity)){
            let elementConfig = sc.get(layerElements, elementType, []);
            let elementData = this.extractElementDimensions(elementConfig);
            if(!elementData){
                continue;
            }
            let elementPositions = this.findElementPositionsInMap(map, elementType);
            validation.totalElements += elementPositions.length;
            for(let position of elementPositions){
                let boundaryCheck = this.checkElementWithinBoundaries(position, width, height);
                if(boundaryCheck.isValid){
                    validation.withinBoundaries++;
                    continue;
                }
                validation.outsideBoundaries++;
                validation.violations.push({
                    elementType,
                    position,
                    boundaryViolations: boundaryCheck.violations
                });
                validation.isValid = false;
            }
        }
        return validation;
    }

    checkElementWithinBoundaries(position, mapWidth, mapHeight)
    {
        let violations = [];
        if(0 > position.x){
            violations.push('Left boundary violation: x='+position.x);
        }
        if(0 > position.y){
            violations.push('Top boundary violation: y='+position.y);
        }
        let rightBound = position.x + position.width - 1;
        if(rightBound >= mapWidth){
            violations.push('Right boundary violation: right='+rightBound+', mapWidth='+mapWidth);
        }
        let bottomBound = position.y + position.height - 1;
        if(bottomBound >= mapHeight){
            violations.push('Bottom boundary violation: bottom='+bottomBound+', mapHeight='+mapHeight);
        }
        return {
            isValid: 0 === violations.length,
            violations
        };
    }

    validateElementOverlaps(map, config)
    {
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let allElementPositions = [];
        for(let elementType of Object.keys(elementsQuantity)){
            let elementPositions = this.findElementPositionsInMap(map, elementType);
            for(let position of elementPositions){
                allElementPositions.push({...position, elementType});
            }
        }
        let validation = {
            isValid: true,
            totalElements: allElementPositions.length,
            overlapCount: 0,
            overlaps: []
        };
        for(let i = 0; i < allElementPositions.length; i++){
            for(let j = i + 1; j < allElementPositions.length; j++){
                let element1 = allElementPositions[i];
                let element2 = allElementPositions[j];
                let overlapCheck = this.checkElementsOverlap(element1, element2);
                if(overlapCheck.hasOverlap){
                    validation.overlapCount++;
                    validation.overlaps.push({
                        element1,
                        element2,
                        overlapArea: overlapCheck.overlapArea
                    });
                    validation.isValid = false;
                }
            }
        }
        return validation;
    }

    checkElementsOverlap(element1, element2)
    {
        let left1 = element1.x;
        let right1 = element1.x + element1.width - 1;
        let top1 = element1.y;
        let bottom1 = element1.y + element1.height - 1;
        let left2 = element2.x;
        let right2 = element2.x + element2.width - 1;
        let top2 = element2.y;
        let bottom2 = element2.y + element2.height - 1;
        let hasOverlap = !(right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2);
        let overlapArea = null;
        if(hasOverlap){
            let overlapLeft = Math.max(left1, left2);
            let overlapRight = Math.min(right1, right2);
            let overlapTop = Math.max(top1, top2);
            let overlapBottom = Math.min(bottom1, bottom2);
            overlapArea = {
                x: overlapLeft,
                y: overlapTop,
                width: overlapRight - overlapLeft + 1,
                height: overlapBottom - overlapTop + 1
            };
        }
        return {hasOverlap, overlapArea};
    }

}

module.exports.ElementPlacementValidator = ElementPlacementValidator;
