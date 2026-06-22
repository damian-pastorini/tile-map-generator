/**
 *
 * Reldens - Test Map Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapValidator } = require('../lib/validator/map-validator');

class TestMapValidator extends BaseMapGeneratorTest
{

    buildValidMap()
    {
        return {
            type: 'map',
            width: 2,
            height: 2,
            layers: [{name: 'ground', type: 'tilelayer', width: 2, height: 2, data: [0, 0, 0, 0]}]
        };
    }

    async testValidMapPasses()
    {
        await this.test('Structurally valid map passes base validation', async () => {
            let validator = new MapValidator();
            let result = validator.validateMap(this.buildValidMap(), {});
            this.assert(true === result, 'Valid map should pass');
            this.assertEqual(validator.validationErrors.length, 0, 'No errors expected');
        });
    }

    async testInvalidMapStructureFails()
    {
        await this.test('Map missing type fails and records error', async () => {
            let validator = new MapValidator();
            let map = this.buildValidMap();
            delete map.type;
            let result = validator.validateMap(map, {});
            this.assert(false === result, 'Invalid map should fail');
            this.assert(0 < validator.validationErrors.length, 'Errors should be recorded');
        });
    }

    async testInvalidConfigurationFails()
    {
        await this.test('Non-object configuration fails validation', async () => {
            let validator = new MapValidator();
            let result = validator.validateMap(this.buildValidMap(), null);
            this.assert(false === result, 'Null config should fail');
            this.assert(0 < validator.validationErrors.length, 'Config error should be recorded');
        });
    }

    async testClassifyNonZeroTilesFindsViolations()
    {
        await this.test('classifyNonZeroTiles reports disallowed tiles', async () => {
            let validator = new MapValidator();
            let violations = validator.classifyNonZeroTiles([0, 5, 9, 0], [5], (tile, index) => ({tile, index}));
            this.assertEqual(violations.length, 1, 'One disallowed tile expected');
            this.assertEqual(violations[0].tile, 9, 'Violation should reference disallowed tile');
        });
    }

}

module.exports.TestMapValidator = TestMapValidator;
