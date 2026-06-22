/**
 *
 * Reldens - Tile Map Generator - GroundVariationsValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { TileCountingUtility } = require('../map/tile-counting-utility');
const { sc } = require('@reldens/utils');

class GroundVariationsValidator extends MapValidator
{

    performValidation(map, config, options)
    {
        return this.runValidationPipeline([
            {
                label: 'Variation Percentage Validation',
                run: () => this.validateVariationPercentage(map, config)
            },
            {
                label: 'Variation Tile Types Validation',
                run: () => this.validateVariationTileTypes(map, config)
            },
            {
                label: 'Variation Placement Validation',
                run: () => this.validateVariationPlacement(map, config)
            }
        ]);
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
        let variationCount = TileCountingUtility.countVariationTiles(groundVariationsLayer.data, randomGroundTiles);
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
        let totalGroundTiles = TileCountingUtility.countAvailableGroundTiles(pathLayerData, groundTile);
        let variationTiles = TileCountingUtility.countVariationTiles(groundVariationsLayer.data, randomGroundTiles);
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
        let nonZeroCount = TileCountingUtility.countNonZeroTiles(layerData);
        validation.violations = this.classifyNonZeroTiles(layerData, randomGroundTiles, (tile, index) =>
        {
            return {
                tileIndex: index,
                actualTile: tile,
                expectedTiles: randomGroundTiles,
                issue: 'unexpected-variation-tile'
            };
        });
        validation.incorrectTileTypes = validation.violations.length;
        validation.correctTileTypes = nonZeroCount - validation.incorrectTileTypes;
        validation.isValid = 0 === validation.violations.length;
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
        let nonZeroCount = TileCountingUtility.countNonZeroTiles(layerData);
        let classified = this.classifyNonZeroTiles(layerData, [], (variationTile, index) =>
        {
            let pathTile = pathLayer ? pathLayer.data[index] : 0;
            if(0 !== pathTile){
                return {
                    tileIndex: index,
                    issue: 'variation-overwrites-path',
                    variationTile,
                    pathTile
                };
            }
            return null;
        });
        validation.violations = classified.filter((violation) => null !== violation);
        validation.incorrectPlacements = validation.violations.length;
        validation.correctPlacements = nonZeroCount - validation.incorrectPlacements;
        validation.isValid = 0 === validation.violations.length;
        return validation;
    }

}

module.exports.GroundVariationsValidator = GroundVariationsValidator;
