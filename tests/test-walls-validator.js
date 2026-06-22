/**
 *
 * Reldens - Test Walls Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { WallsValidator } = require('../lib/validator/walls-validator');

class TestWallsValidator extends BaseMapGeneratorTest
{

    async testNoSurroundingTilesPasses()
    {
        await this.test('No surrounding tiles passes inner wall placement', async () => {
            let validator = new WallsValidator();
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateInnerWallPlacement(map, {surroundingTiles: {}});
            this.assert(true === result.isValid, 'No surrounding tiles should pass');
            this.assertEqual(result.reason, 'No surrounding tiles configured', 'Expected no surrounding tiles reason');
        });
    }

    async testInnerWallsLayerMissingFails()
    {
        await this.test('Missing inner-walls layer fails inner wall placement', async () => {
            let validator = new WallsValidator();
            let map = {width: 4, height: 4, layers: [{name: 'borders', type: 'tilelayer', data: new Array(16).fill(0)}]};
            let config = {surroundingTiles: {'0,1': 129}};
            let result = validator.validateInnerWallPlacement(map, config);
            this.assert(false === result.isValid, 'Missing inner-walls layer should fail');
            this.assertEqual(result.reason, 'Inner walls layer not found', 'Expected missing layer reason');
        });
    }

    async testWallTileTypesValid()
    {
        await this.test('Allowed wall tiles pass wall tile types validation', async () => {
            let validator = new WallsValidator();
            let map = {
                width: 4,
                height: 4,
                layers: [{name: 'inner-walls', type: 'tilelayer', data: this.tilesAt([124, 129])}]
            };
            let config = {surroundingTiles: {'-1,0': 124, '0,1': 129}};
            let result = validator.validateWallTileTypes(map, config);
            this.assert(true === result.isValid, 'Allowed wall tiles should pass');
            this.assertEqual(result.correctTileTypes, 2, 'Two correct wall tiles expected');
        });
    }

    async testWallTileTypesInvalid()
    {
        await this.test('Unexpected wall tile fails wall tile types validation', async () => {
            let validator = new WallsValidator();
            let map = {
                width: 4,
                height: 4,
                layers: [{name: 'inner-walls', type: 'tilelayer', data: this.tilesAt([124, 999])}]
            };
            let config = {surroundingTiles: {'-1,0': 124, '0,1': 129}};
            let result = validator.validateWallTileTypes(map, config);
            this.assert(false === result.isValid, 'Unexpected wall tile should fail');
            this.assertEqual(result.incorrectTileTypes, 1, 'One incorrect wall tile expected');
        });
    }

    async testCornerValidationNoCornersPasses()
    {
        await this.test('No corners configured passes corner validation', async () => {
            let validator = new WallsValidator();
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateCornerTilePlacement(map, {corners: {}});
            this.assert(true === result.isValid, 'No corners should pass');
            this.assertEqual(result.reason, 'No corner tiles configured', 'Expected no corners reason');
        });
    }

    tilesAt(values)
    {
        let data = new Array(16).fill(0);
        for(let i = 0; i < values.length; i++){
            data[i] = values[i];
        }
        return data;
    }

}

module.exports.TestWallsValidator = TestWallsValidator;
