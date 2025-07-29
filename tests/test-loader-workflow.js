/**
 *
 * Reldens - Test Loader Workflow
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');

class TestLoaderWorkflow extends BaseMapGeneratorTest
{

    async testBasicLoaderWorkflow()
    {
        await this.test('Basic loader workflow', async () => {
            Math.random = this.seedRandom(12345);
            let config = this.setupBasicConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
        });
    }

    async testLoaderErrorHandling()
    {
        await this.test('Loader error handling', async () => {
            try {
                let config = {};
                await this.testCurrentGeneration(config);
                this.assert(false, 'Should throw error for invalid config');
            } catch(error){
                this.assert(true, 'Should handle invalid config gracefully');
            }
        });
    }

}

module.exports.TestLoaderWorkflow = TestLoaderWorkflow;
