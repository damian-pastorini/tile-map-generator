/**
 *
 * Reldens - Tile Map Generator - GroundVariationsValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { sc } = require('@reldens/utils');

class GroundVariationsValidator extends MapValidator
{

    performValidation(map, config, options)
    {
        let percentageValidation = this.validateVariationPercentage(map, config);
        this.logValidationResult('Variation Percentage Validation', percentageValidation);
        if(!percentageValidation.isValid){
            return false;
        }
        let tileTypesValidation = this.validateVariationTileTypes(map, config);
        this.logValidationResult('Variation Tile Types Validation', tileTypesValidation);
        if(!tileTypesValidation.isValid){
            return false;
        }
        let placementValidation = this.validateVariationPlacement(map, config);
        this.logValidationResult('Variation Placement Validation', placementValidation);
        return placementValidation.isValid;
    }

    validateVariationQuantity(map, config)
    {
        let randomGroundTiles = sc.get(config, 'randomGroundTiles', []);
        let variableTilesPercentage = sc.get(config, 'variableTilesPercentage', 0);
        if(0 === randomGroundTiles.length || 0 === variableTilesPercentage){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: false, reason: 'Ground variations layer not found'};
        }
        let variationCount = this.countVariationTiles(groundVariationsLayer.data, randomGroundTiles);
        return {
            isValid: 0 < variationCount,
            variationCount,
            configured: 0 < variableTilesPercentage,
            reason: 0 === variationCount ? 'No variation tiles found' : 'Variations found'
        };
    }

    validateVariationPercentage(map, config, tolerance)
    {
        if(undefined === tolerance){
            return {isValid: false, reason: 'tolerance parameter is required'};
        }
        let randomGroundTiles = sc.get(config, 'randomGroundTiles', []);
        let variableTilesPercentage = sc.get(config, 'variableTilesPercentage', 0);
        let groundTile = sc.get(config, 'groundTile', 0);
        if(0 === randomGroundTiles.length){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        if(0 === variableTilesPercentage){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: false, reason: 'Ground variations layer not found'};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        let pathLayerData = pathLayer ? pathLayer.data : [];
        let totalGroundTiles = this.countAvailableGroundTiles(pathLayerData, groundTile);
        let variationTiles = this.countVariationTiles(groundVariationsLayer.data, randomGroundTiles);
        let actualPercentage = 0 === totalGroundTiles ? 0 : (variationTiles / totalGroundTiles) * 100;
        let percentageDifference = Math.abs(actualPercentage - variableTilesPercentage);
        let isWithinTolerance = percentageDifference <= tolerance;
        return {
            isValid: isWithinTolerance,
            totalGroundTiles,
            variationTiles,
            expectedPercentage: variableTilesPercentage,
            actualPercentage,
            percentageDifference,
            tolerance,
            withinTolerance: isWithinTolerance
        };
    }

    countAvailableGroundTiles(pathLayerData, groundTile)
    {
        if(!sc.isArray(pathLayerData)){
            return 0;
        }
        let groundTileCount = 0;
        for(let tile of pathLayerData){
            if(0 === tile){
                groundTileCount++;
            }
        }
        return groundTileCount;
    }

    countVariationTiles(variationsLayerData, randomGroundTiles)
    {
        if(!sc.isArray(variationsLayerData) || !sc.isArray(randomGroundTiles)){
            return 0;
        }
        let variationCount = 0;
        for(let tile of variationsLayerData){
            if(-1 !== randomGroundTiles.indexOf(tile)){
                variationCount++;
            }
        }
        return variationCount;
    }

    validateVariationTileTypes(map, config)
    {
        let randomGroundTiles = sc.get(config, 'randomGroundTiles', []);
        if(0 === randomGroundTiles.length){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: false, reason: 'Ground variations layer not found'};
        }
        let validation = {
            isValid: true,
            correctTileTypes: 0,
            incorrectTileTypes: 0,
            violations: []
        };
        let layerData = groundVariationsLayer.data;
        for(let i = 0; i < layerData.length; i++){
            let tile = layerData[i];
            if(0 === tile){
                continue;
            }
            if(-1 !== randomGroundTiles.indexOf(tile)){
                validation.correctTileTypes++;
                continue;
            }
            validation.incorrectTileTypes++;
            validation.violations.push({
                tileIndex: i,
                actualTile: tile,
                expectedTiles: randomGroundTiles,
                issue: 'unexpected-variation-tile'
            });
            validation.isValid = false;
        }
        return validation;
    }

    validateVariationPlacement(map, config)
    {
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: true, reason: 'Ground variations layer not found'};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        let validation = {
            isValid: true,
            correctPlacements: 0,
            incorrectPlacements: 0,
            violations: []
        };
        let layerData = groundVariationsLayer.data;
        for(let i = 0; i < layerData.length; i++){
            let variationTile = layerData[i];
            if(0 === variationTile){
                continue;
            }
            let pathTile = pathLayer ? pathLayer.data[i] : 0;
            if(0 !== pathTile){
                validation.incorrectPlacements++;
                validation.violations.push({
                    tileIndex: i,
                    issue: 'variation-overwrites-path',
                    variationTile,
                    pathTile
                });
                validation.isValid = false;
                continue;
            }
            validation.correctPlacements++;
        }
        return validation;
    }

}

module.exports.GroundVariationsValidator = GroundVariationsValidator;
