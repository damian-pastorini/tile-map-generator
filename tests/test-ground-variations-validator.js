/**
 *
 * Reldens - Test Ground Variations Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { GroundVariationsValidator } = require('../lib/validator/ground-variations-validator');

class TestGroundVariationsValidator extends BaseMapGeneratorTest
{

    async testNoVariationsConfiguredPasses()
    {
        await this.test('No randomGroundTiles passes tile types validation', async () => {
            let validator = new GroundVariationsValidator();
            let result = validator.validateVariationTileTypes({layers: []}, {randomGroundTiles: []});
            this.assert(true === result.isValid, 'No variations configured should pass');
        });
    }

    async testVariationTileTypesValid()
    {
        await this.test('Allowed variation tiles pass tile types validation', async () => {
            let validator = new GroundVariationsValidator();
            let map = {layers: [{name: 'ground-variations', type: 'tilelayer', data: [0, 26, 27, 0]}]};
            let result = validator.validateVariationTileTypes(map, {randomGroundTiles: [26, 27, 28]});
            this.assert(true === result.isValid, 'Allowed variation tiles should pass');
            this.assertEqual(result.correctTileTypes, 2, 'Two correct tiles expected');
        });
    }

    async testVariationTileTypesInvalid()
    {
        await this.test('Unexpected variation tile fails tile types validation', async () => {
            let validator = new GroundVariationsValidator();
            let map = {layers: [{name: 'ground-variations', type: 'tilelayer', data: [0, 26, 99, 0]}]};
            let result = validator.validateVariationTileTypes(map, {randomGroundTiles: [26, 27, 28]});
            this.assert(false === result.isValid, 'Unexpected tile should fail');
            this.assertEqual(result.incorrectTileTypes, 1, 'One incorrect tile expected');
        });
    }

    async testVariationLayerMissingFails()
    {
        await this.test('Missing ground-variations layer fails tile types validation', async () => {
            let validator = new GroundVariationsValidator();
            let result = validator.validateVariationTileTypes({layers: []}, {randomGroundTiles: [26]});
            this.assert(false === result.isValid, 'Missing layer should fail');
            this.assertEqual(result.reason, 'Ground variations layer not found', 'Expected missing layer reason');
        });
    }

    async testVariationPlacementOverwritingPathFails()
    {
        await this.test('Variation tile over a path tile fails placement validation', async () => {
            let validator = new GroundVariationsValidator();
            let map = {
                layers: [
                    {name: 'ground-variations', type: 'tilelayer', data: [0, 26, 0, 0]},
                    {name: 'path', type: 'tilelayer', data: [0, 121, 0, 0]}
                ]
            };
            let result = validator.validateVariationPlacement(map, {});
            this.assert(false === result.isValid, 'Variation overwriting path should fail');
            this.assertEqual(result.incorrectPlacements, 1, 'One incorrect placement expected');
        });
    }

    async testVariationPlacementClearPasses()
    {
        await this.test('Variation tiles off path pass placement validation', async () => {
            let validator = new GroundVariationsValidator();
            let map = {
                layers: [
                    {name: 'ground-variations', type: 'tilelayer', data: [26, 0, 27, 0]},
                    {name: 'path', type: 'tilelayer', data: [0, 121, 0, 121]}
                ]
            };
            let result = validator.validateVariationPlacement(map, {});
            this.assert(true === result.isValid, 'Non-overlapping variations should pass');
            this.assertEqual(result.correctPlacements, 2, 'Two correct placements expected');
        });
    }

    async testVariationQuantityNoConfigPasses()
    {
        await this.test('No random ground tiles passes quantity validation', async () => {
            let validator = new GroundVariationsValidator();
            let result = validator.validateVariationQuantity({layers: []}, {randomGroundTiles: [], variableTilesPercentage: 0});
            this.assert(true === result.isValid, 'No variation config should pass');
            this.assertEqual(result.reason, 'No ground variations configured', 'Expected no-config reason');
        });
    }

    async testVariationQuantityFound()
    {
        await this.test('Variation tiles present pass quantity validation', async () => {
            let validator = new GroundVariationsValidator();
            let map = {layers: [{name: 'ground-variations', type: 'tilelayer', data: [0, 26, 27, 0]}]};
            let config = {randomGroundTiles: [26, 27, 28], variableTilesPercentage: 10};
            let result = validator.validateVariationQuantity(map, config);
            this.assert(true === result.isValid, 'Found variation tiles should pass');
            this.assertEqual(result.variationCount, 2, 'Two variation tiles expected');
        });
    }

    async testVariationQuantityMissingLayerFails()
    {
        await this.test('Missing ground-variations layer fails quantity validation', async () => {
            let validator = new GroundVariationsValidator();
            let config = {randomGroundTiles: [26], variableTilesPercentage: 10};
            let result = validator.validateVariationQuantity({layers: []}, config);
            this.assert(false === result.isValid, 'Missing layer should fail');
            this.assertEqual(result.reason, 'Ground variations layer not found', 'Expected missing layer reason');
        });
    }

    async testVariationPercentageRequiresTolerance()
    {
        await this.test('Variation percentage validation requires tolerance parameter', async () => {
            let validator = new GroundVariationsValidator();
            let map = {layers: [{name: 'ground-variations', type: 'tilelayer', data: [26]}]};
            let result = validator.validateVariationPercentage(map, {randomGroundTiles: [26], variableTilesPercentage: 10});
            this.assert(false === result.isValid, 'Missing tolerance should fail');
            this.assertEqual(result.reason, 'tolerance parameter is required', 'Expected tolerance required reason');
        });
    }

    buildPercentageMap()
    {
        let layers = [];
        layers.push({name: 'ground-variations', type: 'tilelayer', data: [26, 26, 0, 0, 0, 0, 0, 0, 0, 0]});
        layers.push({name: 'path', type: 'tilelayer', data: [0, 0, 0, 0, 0, 0, 0, 0, 121, 121]});
        return {layers};
    }

    async testVariationPercentageWithinTolerance()
    {
        await this.test('Variation percentage within tolerance passes', async () => {
            let validator = new GroundVariationsValidator();
            let map = this.buildPercentageMap();
            let config = {randomGroundTiles: [26, 27], variableTilesPercentage: 25, groundTile: 116};
            let result = validator.validateVariationPercentage(map, config, 0);
            this.assert(true === result.isValid, 'Exact percentage should pass');
            this.assertEqual(result.totalGroundTiles, 8, 'Eight available ground tiles expected');
            this.assertEqual(result.variationTiles, 2, 'Two variation tiles expected');
            this.assertEqual(result.actualPercentage, 25, 'Actual percentage should be 25');
        });
    }

    async testVariationPercentageOutsideToleranceFails()
    {
        await this.test('Variation percentage outside tolerance fails', async () => {
            let validator = new GroundVariationsValidator();
            let map = this.buildPercentageMap();
            let config = {randomGroundTiles: [26, 27], variableTilesPercentage: 50, groundTile: 116};
            let result = validator.validateVariationPercentage(map, config, 5);
            this.assert(false === result.isValid, 'Percentage gap beyond tolerance should fail');
            this.assertEqual(result.percentageDifference, 25, 'Difference of 25 expected');
        });
    }

    async testPerformValidationReturnsFalseWithoutTolerance()
    {
        await this.test('performValidation stops at percentage step that needs a tolerance', async () => {
            let validator = new GroundVariationsValidator();
            let map = {layers: [{name: 'ground-variations', type: 'tilelayer', data: [26, 0, 27, 0]}]};
            let config = {randomGroundTiles: [26, 27], variableTilesPercentage: 10};
            let result = validator.performValidation(map, config, {});
            this.assert(false === result, 'Percentage step without tolerance makes the pipeline fail');
        });
    }

}

module.exports.TestGroundVariationsValidator = TestGroundVariationsValidator;
