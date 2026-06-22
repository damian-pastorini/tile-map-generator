/**
 *
 * Reldens - Tile Map Generator - ElementPlacementValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { ElementPositionAnalyzer } = require('../map/element-position-analyzer');
const { PatternMatcher } = require('../map/pattern-matcher');
const { Logger, sc } = require('@reldens/utils');

class ElementPlacementValidator extends MapValidator
{

    constructor()
    {
        super();
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
        this.patternMatcher = new PatternMatcher();
    }

    performValidation(map, config, options)
    {
        return this.runValidationPipeline([
            {label: 'Element Quantity Validation', run: () => this.validateElementQuantities(map, config)},
            {label: 'Element Position Validation', run: () => this.validateElementPositions(map, config)},
            {label: 'Element Boundary Validation', run: () => this.validateElementBoundaries(map, config)},
            {label: 'Element Overlap Validation', run: () => this.validateElementOverlaps(map, config)}
        ]);
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
            let actualCount = this.patternMatcher.countElementInstancesInMap(map, config, elementType);
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
            let elementPositions = this.elementPositionAnalyzer.findElementPositionsInMap(map, elementType);
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
            let elementPositions = this.elementPositionAnalyzer.findElementPositionsInMap(map, elementType);
            validation.totalElements += elementPositions.length;
            for(let position of elementPositions){
                let boundaryCheck = this.boundaryValidator.checkElementWithinBoundaries(position, width, height);
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

    validateElementOverlaps(map, config)
    {
        let allElementPositions = this.elementPositionAnalyzer.gatherElementPositions(map, config);
        let validation = {
            isValid: true,
            totalElements: allElementPositions.length,
            overlapCount: 0,
            overlaps: []
        };
        this.elementPositionAnalyzer.forEachElementPair(allElementPositions, (element1, element2) => {
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
        });
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
        let hasOverlap = this.geometryCalculator.rectsOverlap(element1, element2);
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
