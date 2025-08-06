/**
 *
 * Reldens - Tile Map Generator - FreeSpaceValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { DistanceCalculator } = require('../utilities/distance-calculator');
const { sc } = require('@reldens/utils');

class FreeSpaceValidator extends MapValidator
{

    constructor()
    {
        super();
        this.distanceCalculator = new DistanceCalculator();
    }

    performValidation(map, config, options)
    {
        let minimumDistanceValidation = this.validateFreeSpaceMinimums(map, config);
        this.logValidationResult('Free Space Minimums Validation', minimumDistanceValidation);
        if(!minimumDistanceValidation.isValid){
            return false;
        }
        let boundaryValidation = this.validateFreeSpaceBoundaries(map, config);
        this.logValidationResult('Free Space Boundaries Validation', boundaryValidation);
        if(!boundaryValidation.isValid){
            return false;
        }
        let pathsInFreeSpaceValidation = this.validatePathsInFreeSpace(map, config);
        this.logValidationResult('Paths In Free Space Validation', pathsInFreeSpaceValidation);
        return pathsInFreeSpaceValidation.isValid;
    }

    validateFreeSpaceMinimums(map, config)
    {
        let elementsFreeSpaceAround = sc.get(config, 'elementsFreeSpaceAround', {});
        let minimumElementsFreeSpaceAround = sc.get(config, 'minimumElementsFreeSpaceAround', 0);
        let elementPositions = this.gatherElementPositions(map, config);
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
        for(let i = 0; i < elementPositions.length; i++){
            for(let j = i + 1; j < elementPositions.length; j++){
                let element1 = elementPositions[i];
                let element2 = elementPositions[j];
                let distance = this.distanceCalculator.calculateEuclideanDistance(element1, element2);
                let requiredDistance1 = sc.get(
                    elementsFreeSpaceAround,
                    element1.elementType,
                    minimumElementsFreeSpaceAround
                );
                let requiredDistance2 = sc.get(
                    elementsFreeSpaceAround,
                    element2.elementType,
                    minimumElementsFreeSpaceAround
                );
                let minimumRequired = Math.max(requiredDistance1, requiredDistance2);
                if(distance >= minimumRequired){
                    validation.validDistances++;
                    continue;
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
            }
        }
        let totalDistances = validation.validDistances + validation.violatedDistances;
        validation.compliancePercentage = 0 === totalDistances
            ? 100
            : (validation.validDistances / totalDistances) * 100;
        return validation;
    }

    gatherElementPositions(map, config)
    {
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let elementPositions = [];
        for(let elementType of Object.keys(elementsQuantity)){
            let positions = this.findElementPositionsInMap(map, elementType);
            for(let pos of positions){
                elementPositions.push({...pos, elementType});
            }
        }
        return elementPositions;
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
                    x: elementPosition.x,
                    y: elementPosition.y,
                    width: elementPosition.width,
                    height: elementPosition.height,
                    layerName
                });
            }
        }
        return positions;
    }

    validateFreeSpaceBoundaries(map, config)
    {
        let elementsFreeSpaceAround = sc.get(config, 'elementsFreeSpaceAround', {});
        let minimumElementsFreeSpaceAround = sc.get(config, 'minimumElementsFreeSpaceAround', 0);
        let elementPositions = this.gatherElementPositions(map, config);
        let validation = {
            isValid: true,
            totalElements: elementPositions.length,
            validBoundaries: 0,
            invalidBoundaries: 0,
            violations: []
        };
        for(let element of elementPositions){
            let freeSpaceRequired = sc.get(
                elementsFreeSpaceAround,
                element.elementType,
                minimumElementsFreeSpaceAround
            );
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
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let boundary = this.distanceCalculator.calculateFreeSpaceBoundary(element, freeSpaceRequired);
        let violations = [];
        let allowedTiles = this.getAllowedTilesInFreeSpace(element, config);
        for(let dy = -freeSpaceRequired; dy <= freeSpaceRequired; dy++){
            for(let dx = -freeSpaceRequired; dx <= freeSpaceRequired; dx++){
                let checkX = element.x + dx;
                let checkY = element.y + dy;
                if(!this.isPositionWithinBounds(checkX, checkY, width, height)){
                    continue;
                }
                let isElementTile = checkX >= element.x
                    && checkX < element.x + element.width
                    && checkY >= element.y
                    && checkY < element.y + element.height;
                if(isElementTile){
                    continue;
                }
                if(!this.isTileAllowedInFreeSpace(checkX, checkY, map, allowedTiles)){
                    violations.push({
                        position: {x: checkX, y: checkY},
                        issue: 'non-allowed-tile-in-free-space'
                    });
                }
            }
        }
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
        let elementsAllowPathsInFreeSpace = sc.get(config, 'elementsAllowPathsInFreeSpace', {});
        let defaultElementsAllowPathsInFreeSpace = sc.get(config, 'defaultElementsAllowPathsInFreeSpace', true);
        let allowPaths = sc.get(
            elementsAllowPathsInFreeSpace,
            element.elementType,
            defaultElementsAllowPathsInFreeSpace
        );
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
        let elementsAllowPathsInFreeSpace = sc.get(config, 'elementsAllowPathsInFreeSpace', {});
        let defaultElementsAllowPathsInFreeSpace = sc.get(config, 'defaultElementsAllowPathsInFreeSpace', true);
        let pathTile = sc.get(config, 'pathTile', 0);
        if(0 === pathTile){
            return {isValid: true, reason: 'No path tile configured'};
        }
        let elementPositions = this.gatherElementPositions(map, config);
        let validation = {
            isValid: true,
            totalElements: elementPositions.length,
            correctPathHandling: 0,
            incorrectPathHandling: 0,
            violations: []
        };
        for(let element of elementPositions){
            let allowPaths = sc.get(
                elementsAllowPathsInFreeSpace,
                element.elementType,
                defaultElementsAllowPathsInFreeSpace
            );
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
        let elementsFreeSpaceAround = sc.get(config, 'elementsFreeSpaceAround', {});
        let minimumElementsFreeSpaceAround = sc.get(config, 'minimumElementsFreeSpaceAround', 0);
        let freeSpaceRequired = sc.get(elementsFreeSpaceAround, element.elementType, minimumElementsFreeSpaceAround);
        let pathTile = sc.get(config, 'pathTile', 0);
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return {isValid: true, reason: 'No path layer found'};
        }
        let width = sc.get(map, 'width', 0);
        let violations = [];
        for(let dy = -freeSpaceRequired; dy <= freeSpaceRequired; dy++){
            for(let dx = -freeSpaceRequired; dx <= freeSpaceRequired; dx++){
                let checkX = element.x + dx;
                let checkY = element.y + dy;
                if(!this.isPositionWithinBounds(checkX, checkY, width, sc.get(map, 'height', 0))){
                    continue;
                }
                let isElementTile = checkX >= element.x
                    && checkX < element.x + element.width
                    && checkY >= element.y
                    && checkY < element.y + element.height;
                if(isElementTile){
                    continue;
                }
                let index = checkY * width + checkX;
                let tile = pathLayer.data[index];
                if(tile === pathTile){
                    if(!allowPaths){
                        violations.push({
                            position: {x: checkX, y: checkY},
                            issue: 'path-in-free-space-not-allowed'
                        });
                    }
                }
            }
        }
        return {
            isValid: 0 === violations.length,
            element,
            allowPaths,
            violations
        };
    }

}

module.exports.FreeSpaceValidator = FreeSpaceValidator;
