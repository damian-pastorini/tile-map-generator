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

}

module.exports.TestGroundVariationsValidator = TestGroundVariationsValidator;
