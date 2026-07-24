/**
 *
 * Reldens - Tile Map Generator - FreeSpaceValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { ElementPositionAnalyzer } = require('../map/element-position-analyzer');
const { DistanceCalculator } = require('../map/distance-calculator');
const { sc } = require('@reldens/utils');

class FreeSpaceValidator extends MapValidator
{

    constructor()
    {
        super();
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
        this.distanceCalculator = new DistanceCalculator();
    }

    performValidation(map, config, options)
    {
        return this.runValidationPipeline([
            {
                label: 'Free Space Minimums Validation',
                run: () => this.validateFreeSpaceMinimums(map, config)
            },
            {
                label: 'Free Space Boundaries Validation',
                run: () => this.validateFreeSpaceBoundaries(map, config)
            },
            {
                label: 'Paths In Free Space Validation',
                run: () => this.validatePathsInFreeSpace(map, config)
            }
        ]);
    }

    validateFreeSpaceMinimums(map, config)
    {
        let elementPositions = this.elementPositionAnalyzer.gatherElementPositions(map, config);
        if(0 === elementPositions.length){
            return {isValid: true, reason: 'No elements to validate'};
        }
        let validation = {
            isValid: true,
            totalElements: elementPositions.length,
            validDistances: 0,
            violatedDistances: 0,
            violations: []
        };
        this.elementPositionAnalyzer.forEachElementPair(elementPositions, (element1, element2) => {
            let distance = this.distanceCalculator.calculateEuclideanDistance(element1, element2);
            let requiredDistance1 = this.resolveElementFreeSpace(config, element1.elementType);
            let requiredDistance2 = this.resolveElementFreeSpace(config, element2.elementType);
            let minimumRequired = Math.max(requiredDistance1, requiredDistance2);
            if(distance >= minimumRequired){
                validation.validDistances++;
                return;
            }
            validation.violatedDistances++;
            validation.violations.push({
                element1,
                element2,
                actualDistance: distance,
                requiredDistance: minimumRequired,
                violation: minimumRequired - distance
            });
            validation.isValid = false;
        });
        let totalDistances = validation.validDistances + validation.violatedDistances;
        validation.compliancePercentage = 0 === totalDistances
            ? 100
            : (validation.validDistances / totalDistances) * 100;
        return validation;
    }

    validateFreeSpaceBoundaries(map, config)
    {
        let elementPositions = this.elementPositionAnalyzer.gatherElementPositions(map, config);
        let validation = {
            isValid: true,
            totalElements: elementPositions.length,
            validBoundaries: 0,
            invalidBoundaries: 0,
            violations: []
        };
        for(let element of elementPositions){
            let freeSpaceRequired = this.resolveElementFreeSpace(config, element.elementType);
            let boundaryValidation = this.validateSingleElementBoundary(element, freeSpaceRequired, map, config);
            if(boundaryValidation.isValid){
                validation.validBoundaries++;
                continue;
            }
            validation.invalidBoundaries++;
            validation.violations.push(boundaryValidation);
            validation.isValid = false;
        }
        return validation;
    }

    validateSingleElementBoundary(element, freeSpaceRequired, map, config)
    {
        let boundary = this.distanceCalculator.calculateFreeSpaceBoundary(element, freeSpaceRequired);
        let violations = [];
        let allowedTiles = this.getAllowedTilesInFreeSpace(element, config);
        this.iterateFreeSpaceCells(element, freeSpaceRequired, map, (checkX, checkY) => {
            if(!this.isTileAllowedInFreeSpace(checkX, checkY, map, allowedTiles)){
                violations.push({
                    position: {x: checkX, y: checkY},
                    issue: 'non-allowed-tile-in-free-space'
                });
            }
        });
        return {
            isValid: 0 === violations.length,
            element,
            freeSpaceRequired,
            boundary,
            violations
        };
    }

    getAllowedTilesInFreeSpace(element, config)
    {
        let groundTile = sc.get(config, 'groundTile', 0);
        let allowedTiles = [0, groundTile];
        let allowPaths = this.resolveAllowPathsInFreeSpace(config, element.elementType);
        if(allowPaths){
            let pathTile = sc.get(config, 'pathTile', 0);
            if(0 !== pathTile){
                allowedTiles.push(pathTile);
            }
        }
        return allowedTiles;
    }

    isTileAllowedInFreeSpace(x, y, map, allowedTiles)
    {
        let layers = sc.get(map, 'layers', []);
        let width = sc.get(map, 'width', 0);
        let index = y * width + x;
        for(let layer of layers){
            let layerData = sc.get(layer, 'data', []);
            if(index >= layerData.length){
                continue;
            }
            let tile = layerData[index];
            if(0 !== tile && -1 === allowedTiles.indexOf(tile)){
                return false;
            }
        }
        return true;
    }

    validatePathsInFreeSpace(map, config)
    {
        let pathTile = sc.get(config, 'pathTile', 0);
        if(0 === pathTile){
            return {isValid: true, reason: 'No path tile configured'};
        }
        let elementPositions = this.elementPositionAnalyzer.gatherElementPositions(map, config);
        let validation = {
            isValid: true,
            totalElements: elementPositions.length,
            correctPathHandling: 0,
            incorrectPathHandling: 0,
            violations: []
        };
        for(let element of elementPositions){
            let allowPaths = this.resolveAllowPathsInFreeSpace(config, element.elementType);
            let pathValidation = this.validatePathsForElement(element, map, config, allowPaths);
            if(pathValidation.isValid){
                validation.correctPathHandling++;
                continue;
            }
            validation.incorrectPathHandling++;
            validation.violations.push(pathValidation);
            validation.isValid = false;
        }
        return validation;
    }

    validatePathsForElement(element, map, config, allowPaths)
    {
        let freeSpaceRequired = this.resolveElementFreeSpace(config, element.elementType);
        let pathTile = sc.get(config, 'pathTile', 0);
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return {isValid: true, reason: 'No path layer found'};
        }
        let width = sc.get(map, 'width', 0);
        let violations = [];
        this.iterateFreeSpaceCells(element, freeSpaceRequired, map, (checkX, checkY) => {
            let index = checkY * width + checkX;
            let tile = pathLayer.data[index];
            if(tile === pathTile && !allowPaths){
                violations.push({
                    position: {x: checkX, y: checkY},
                    issue: 'path-in-free-space-not-allowed'
                });
            }
        });
        return {
            isValid: 0 === violations.length,
            element,
            allowPaths,
            violations
        };
    }

    resolveElementFreeSpace(config, elementType)
    {
        let elementsFreeSpaceAround = sc.get(config, 'elementsFreeSpaceAround', {});
        let minimumElementsFreeSpaceAround = sc.get(config, 'minimumElementsFreeSpaceAround', 0);
        return sc.get(elementsFreeSpaceAround, elementType, minimumElementsFreeSpaceAround);
    }

    resolveAllowPathsInFreeSpace(config, elementType)
    {
        let elementsAllowPathsInFreeSpace = sc.get(config, 'elementsAllowPathsInFreeSpace', {});
        let defaultElementsAllowPathsInFreeSpace = sc.get(config, 'defaultElementsAllowPathsInFreeSpace', true);
        return sc.get(elementsAllowPathsInFreeSpace, elementType, defaultElementsAllowPathsInFreeSpace);
    }

    iterateFreeSpaceCells(element, radius, map, perCellCallback)
    {
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        for(let dy = -radius; dy <= radius; dy++){
            for(let dx = -radius; dx <= radius; dx++){
                let checkX = element.x + dx;
                let checkY = element.y + dy;
                if(!this.geometryCalculator.isPositionWithinBounds(checkX, checkY, width, height)){
                    continue;
                }
                let isElementTile = checkX >= element.x
                    && checkX < element.x + element.width
                    && checkY >= element.y
                    && checkY < element.y + element.height;
                if(isElementTile){
                    continue;
                }
                perCellCallback(checkX, checkY);
            }
        }
    }

}

module.exports.FreeSpaceValidator = FreeSpaceValidator;
