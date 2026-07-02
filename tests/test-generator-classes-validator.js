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

    async testValidateAllGeneratorClassesPasses()
    {
        await this.test('All generator classes validate against the real test data folder', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.validateAllGeneratorClasses(this.testDataFolder);
            this.assert(true === result.isValid, 'All generator classes should validate');
            this.assert(true === result.objectLoaderValidation.isValid, 'Object loader validation should pass');
            this.assert(true === result.compositeLoaderValidation.isValid, 'Composite loader validation should pass');
            this.assert(true === result.multipleByLoaderValidation.isValid, 'Multiple loader validation should pass');
            this.assert(true === result.associationsValidation.isValid, 'Associations validation should pass');
        });
    }

    async testCreateValidationResultMergesFlags()
    {
        await this.test('createValidationResult merges extra flags and defaults', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.createValidationResult({fileProcessing: true, customFlag: 5});
            this.assert(true === result.isValid, 'Default isValid should be true');
            this.assert(true === result.errorHandling, 'Default errorHandling should be true');
            this.assertEqual(result.violations.length, 0, 'Default violations should be empty');
            this.assert(true === result.fileProcessing, 'Extra flag should be merged');
            this.assertEqual(result.customFlag, 5, 'Custom flag value should be preserved');
        });
    }

    async testHandleValidationErrorMutatesValidation()
    {
        await this.test('handleValidationError records the error and flips flags', async () => {
            let validator = new GeneratorClassesValidator();
            let validation = validator.createValidationResult({});
            let result = validator.handleValidationError(validation, 'Context: ', new Error('boom'));
            this.assert(false === result.isValid, 'isValid should become false');
            this.assert(false === result.errorHandling, 'errorHandling should become false');
            this.assertEqual(result.violations[0], 'Context: boom', 'Violation should combine context and message');
        });
    }

    async testRequireNonEmptyArray()
    {
        await this.test('requireNonEmptyArray distinguishes filled, empty and non-array values', async () => {
            let validator = new GeneratorClassesValidator();
            this.assert(true === validator.requireNonEmptyArray([1, 2]), 'Filled array should pass');
            this.assert(false === validator.requireNonEmptyArray([]), 'Empty array should fail');
            this.assert(false === validator.requireNonEmptyArray('not-an-array'), 'Non-array should fail');
        });
    }

    async testCreateAndValidateBatchConfiguration()
    {
        await this.test('Batch configuration is created from file paths and validates', async () => {
            let validator = new GeneratorClassesValidator();
            let filePaths = ['/maps/house-001.json', '/maps/tree.json'];
            let batchConfig = validator.createBatchConfiguration(filePaths);
            this.assertEqual(batchConfig.files.length, 2, 'Two files expected in batch config');
            this.assertEqual(batchConfig.elementsQuantity['house-001'], 1, 'house-001 quantity should be 1');
            this.assertEqual(batchConfig.elementsQuantity['tree'], 1, 'tree quantity should be 1');
            this.assert(true === validator.validateBatchConfiguration(batchConfig), 'Batch config should validate');
        });
    }

    async testValidateBatchConfigurationEmptyFails()
    {
        await this.test('Batch configuration with no files fails validation', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.validateBatchConfiguration({files: [], elementsQuantity: {tree: 1}});
            this.assert(false === result, 'Empty files batch config should fail');
        });
    }

    async testValidateMultipleByLoaderMissingMinimum()
    {
        await this.test('Multiple loader without minimumFiles returns invalid', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.validateMultipleByLoaderGenerator(this.testDataFolder);
            this.assert(false === result.isValid, 'Missing minimumFiles should fail');
            this.assertEqual(result.reason, 'minimumFiles parameter is required', 'Expected minimumFiles reason');
        });
    }

    async testSimulateAssociationsWorkflowValid()
    {
        await this.test('Workflow simulation counts processed maps and connections', async () => {
            let validator = new GeneratorClassesValidator();
            let associations = validator.createMockAssociations(this.testDataFolder);
            let result = validator.simulateAssociationsWorkflow(associations);
            this.assert(true === result.isValid, 'Valid associations workflow should succeed');
            this.assert(true === result.mainMapProcessed, 'Main map should be processed');
            this.assertEqual(result.associatedMapsProcessed, 1, 'One associated map processed expected');
            this.assertEqual(result.connectionsEstablished, 1, 'One connection established expected');
        });
    }

    async testSimulateAssociationsWorkflowNoAssociatedMapsFails()
    {
        await this.test('Workflow simulation fails when no associated maps exist', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.simulateAssociationsWorkflow({mainMap: {name: 'main'}, associatedMaps: []});
            this.assert(false === result.isValid, 'No associated maps should fail');
            this.assertEqual(result.associatedMapsProcessed, 0, 'No associated maps processed expected');
            this.assert(0 < result.violations.length, 'A violation should be recorded');
        });
    }

    async testValidateLayerElementsObjectLoaderPasses()
    {
        await this.test('Object loader validation reads real element files', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.validateLayerElementsObjectLoader(this.testDataFolder);
            this.assert(true === result.isValid, 'Object loader should validate real files');
            this.assert(true === result.fileProcessing, 'fileProcessing should be true');
            this.assert(true === result.configurationParsing, 'configurationParsing should be true');
        });
    }

    async testValidateLayerElementsCompositeLoaderPasses()
    {
        await this.test('Composite loader validation reads the real composite file', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.validateLayerElementsCompositeLoader(this.testDataFolder);
            this.assert(true === result.isValid, 'Composite loader should validate real composite');
            this.assert(true === result.compositeStructure, 'compositeStructure should be true');
            this.assert(true === result.elementExtraction, 'elementExtraction should be true');
        });
    }

    async testValidateLayerElementsObjectLoaderMissingFolderFails()
    {
        await this.test('Object loader validation fails when files are absent', async () => {
            let validator = new GeneratorClassesValidator();
            let result = validator.validateLayerElementsObjectLoader('/non-existent-folder-xyz');
            this.assert(false === result.isValid, 'Absent files should fail');
            this.assert(false === result.fileProcessing, 'fileProcessing should be false');
        });
    }

}

module.exports.TestGeneratorClassesValidator = TestGeneratorClassesValidator;
