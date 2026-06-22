/**
 *
 * Reldens - Test Generator Classes Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { GeneratorClassesValidator } = require('../lib/validator/generator-classes-validator');

class TestGeneratorClassesValidator extends BaseMapGeneratorTest
{

    async testValidJsonStructurePasses()
    {
        await this.test('Valid element JSON structure passes', async () => {
            let validator = new GeneratorClassesValidator();
            let jsonData = {layers: [{type: 'tilelayer', name: 'tree', data: [0, 1]}]};
            let result = validator.validateJsonStructure(jsonData, 'tree');
            this.assert(true === result, 'Valid JSON structure should pass');
        });
    }

    async testInvalidJsonStructureFails()
    {
        await this.test('JSON without tilelayer fails', async () => {
            let validator = new GeneratorClassesValidator();
            let jsonData = {layers: [{type: 'objectgroup', name: 'tree'}]};
            let result = validator.validateJsonStructure(jsonData, 'tree');
            this.assert(false === result, 'Missing tilelayer should fail');
        });
    }

    async testValidCompositeStructurePasses()
    {
        await this.test('Composite with layers and tilesets passes', async () => {
            let validator = new GeneratorClassesValidator();
            let compositeData = {layers: [{type: 'tilelayer', name: 'g'}], tilesets: [{firstgid: 1}]};
            let result = validator.validateCompositeStructure(compositeData);
            this.assert(true === result, 'Valid composite should pass');
        });
    }

    async testInvalidCompositeStructureFails()
    {
        await this.test('Composite without tilesets fails', async () => {
            let validator = new GeneratorClassesValidator();
            let compositeData = {layers: [{type: 'tilelayer', name: 'g'}], tilesets: []};
            let result = validator.validateCompositeStructure(compositeData);
            this.assert(false === result, 'Missing tilesets should fail');
        });
    }

    async testExtractElementsFromComposite()
    {
        await this.test('Extracts named tilelayers from composite', async () => {
            let validator = new GeneratorClassesValidator();
            let compositeData = {
                layers: [
                    {type: 'tilelayer', name: 'house', width: 2, height: 2, data: [1, 2, 3, 4]},
                    {type: 'objectgroup', name: 'meta'}
                ]
            };
            let extracted = validator.extractElementsFromComposite(compositeData);
            this.assertEqual(extracted.length, 1, 'Only tilelayers should be extracted');
            this.assertEqual(extracted[0].name, 'house', 'Extracted element name should match');
        });
    }

    async testValidAssociationsStructurePasses()
    {
        await this.test('Mock associations structure is valid', async () => {
            let validator = new GeneratorClassesValidator();
            let associations = validator.createMockAssociations(this.testDataFolder);
            let result = validator.validateAssociationsStructure(associations);
            this.assert(true === result, 'Mock associations should be valid');
        });
    }

    async testInvalidAssociationsStructureFails()
    {
        await this.test('Associated map without parentElement fails', async () => {
            let validator = new GeneratorClassesValidator();
            let associations = {mainMap: {name: 'm'}, associatedMaps: [{name: 'a', connection: 'door'}]};
            let result = validator.validateAssociationsStructure(associations);
            this.assert(false === result, 'Missing parentElement should fail');
        });
    }

}

module.exports.TestGeneratorClassesValidator = TestGeneratorClassesValidator;
