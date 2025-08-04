/**
 *
 * Reldens - Test Generator Classes
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { GeneratorClassesValidator } = require('../../lib/validator/generator-classes-validator');

class TestGeneratorClasses extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.generatorClassesValidator = new GeneratorClassesValidator();
    }

    async testLayerElementsObjectLoader()
    {
        await this.test('Layer elements object loader', async () => {
            let validation = this.generatorClassesValidator.validateLayerElementsObjectLoader(this.testDataFolder);
            this.logFunctionalityResult('Layer Elements Object Loader', validation);
            this.assert(validation.isValid, 'Object loader must process files correctly');
            this.assert(validation.fileProcessing, 'File processing must work');
            this.assert(validation.configurationParsing, 'Configuration parsing must work');
        });
    }

    async testLayerElementsCompositeLoader()
    {
        await this.test('Layer elements composite loader', async () => {
            let validation = this.generatorClassesValidator.validateLayerElementsCompositeLoader(this.testDataFolder);
            this.logFunctionalityResult('Layer Elements Composite Loader', validation);
            this.assert(validation.isValid, 'Composite loader must process files correctly');
            this.assert(validation.compositeStructure, 'Composite structure must be valid');
            this.assert(validation.elementExtraction, 'Element extraction must work');
        });
    }

    async testMultipleByLoaderGenerator()
    {
        await this.test('Multiple by loader generator', async () => {
            let validation = this.generatorClassesValidator.validateMultipleByLoaderGenerator(this.testDataFolder);
            this.logFunctionalityResult('Multiple By Loader Generator', validation);
            this.assert(validation.isValid, 'Multiple loader must handle batch processing');
            this.assert(validation.multipleFileHandling, 'Multiple file handling must work');
            this.assert(validation.batchProcessing, 'Batch processing must work');
        });
    }

    async testMultipleWithAssociationsByLoaderGenerator()
    {
        await this.test('Multiple with associations by loader generator', async () => {
            let validation = this.generatorClassesValidator.validateMultipleWithAssociationsByLoaderGenerator(this.testDataFolder);
            this.logFunctionalityResult('Multiple With Associations Loader', validation);
            this.assert(validation.isValid, 'Associations loader must handle workflows');
            this.assert(validation.associationHandling, 'Association handling must work');
            this.assert(validation.workflowConsistency, 'Workflow consistency must be maintained');
        });
    }

    async testAllGeneratorClassesIntegration()
    {
        await this.test('All generator classes integration', async () => {
            let validation = this.generatorClassesValidator.validateAllGeneratorClasses(this.testDataFolder);
            this.logFunctionalityResult('All Generator Classes Integration', validation);
            this.assert(validation.isValid, 'All generator classes must work together');
        });
    }

}

module.exports.TestGeneratorClasses = TestGeneratorClasses;
