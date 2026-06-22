/**
 *
 * Reldens - Test Map Type Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapTypeValidator } = require('../lib/validator/map-type-validator');

class TestMapTypeValidator extends BaseMapGeneratorTest
{

    async testDetermineMapTypeDungeon()
    {
        await this.test('blockMapBorder with entryPosition is dungeon', async () => {
            let validator = new MapTypeValidator();
            let type = validator.determineMapType({blockMapBorder: true, entryPosition: 'top'});
            this.assertEqual(type, 'dungeon', 'Expected dungeon type');
        });
    }

    async testDetermineMapTypeEnclosed()
    {
        await this.test('blockMapBorder without entry is enclosed', async () => {
            let validator = new MapTypeValidator();
            let type = validator.determineMapType({blockMapBorder: true});
            this.assertEqual(type, 'enclosed', 'Expected enclosed type');
        });
    }

    async testDetermineMapTypeNormal()
    {
        await this.test('mainPathSize without border is normal', async () => {
            let validator = new MapTypeValidator();
            let type = validator.determineMapType({mainPathSize: 3});
            this.assertEqual(type, 'normal', 'Expected normal type');
        });
    }

    async testDetermineMapTypeBasic()
    {
        await this.test('No flags result in basic type', async () => {
            let validator = new MapTypeValidator();
            // @possible-hallucinated-undefined-method
            let type = validator.determineMapType({});
            this.assertEqual(type, 'basic', 'Expected basic type');
        });
    }

    async testValidNormalMapPatternsPasses()
    {
        await this.test('Normal map with path layer passes pattern validation', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'path', type: 'tilelayer', data: [1]}]};
            let result = validator.validateNormalMapPatterns(map, {generateElementsPath: true});
            this.assert(true === result.isValid, 'Normal map with path should be valid');
        });
    }

    async testInvalidNormalMapPatternsFails()
    {
        await this.test('Normal map missing path layer fails pattern validation', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'ground', type: 'tilelayer', data: [1]}]};
            let result = validator.validateNormalMapPatterns(map, {generateElementsPath: true});
            this.assert(false === result.isValid, 'Missing path layer should fail');
            this.assert(false === result.connectingPaths, 'connectingPaths flag should be false');
        });
    }

    async testInvalidDungeonMapPatternsFails()
    {
        await this.test('Dungeon map missing border and entry fails', async () => {
            let validator = new MapTypeValidator();
            let map = {layers: [{name: 'ground', type: 'tilelayer', data: [1]}]};
            let result = validator.validateDungeonMapPatterns(map, {});
            this.assert(false === result.isValid, 'Missing enclosure should fail');
            this.assert(false === result.enclosedSpaces, 'enclosedSpaces flag should be false');
        });
    }

}

module.exports.TestMapTypeValidator = TestMapTypeValidator;
