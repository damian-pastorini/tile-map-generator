/**
 *
 * Reldens - Test High Level Generators
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');

class TestHighLevelGenerators extends BaseMapGeneratorTest
{

    async testHighLevelValidation()
    {
        await this.test('High level generator validation', async () => {
            try {
                let config = {};
                await this.testCurrentGeneration(config);
                this.assert(false, 'Should throw error for invalid config');
            } catch(error){
                this.assert(true, 'Should handle invalid config gracefully');
            }
        });
    }

    async testBasicHighLevelGeneration()
    {
        await this.test('Basic high level generation', async () => {
            Math.random = this.seedRandom(12345);
            let config = this.setupBasicConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
        });
    }

}

module.exports.TestHighLevelGenerators = TestHighLevelGenerators;
