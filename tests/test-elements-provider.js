/**
 *
 * Reldens - Test Elements Provider
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');

class TestElementsProvider extends BaseMapGeneratorTest
{

    async testFromElementsProviderWorkflow()
    {
        await this.test('fromElementsProvider workflow', async () => {
            Math.random = this.seedRandom(11111);
            let config = this.setupCompositeConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateElementPlacement(result, config);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testElementsWithCustomProperties()
    {
        await this.test('Elements with custom properties', async () => {
            Math.random = this.seedRandom(22222);
            let config = this.setupCompositeConfig();
            config.elementsFreeSpaceAround = {'house-01': 2, 'tree-base': 1};
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateElementPlacement(result, config);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testElementsProviderWithoutElements()
    {
        await this.test('Elements provider without elements', async () => {
            Math.random = this.seedRandom(33333);
            let config = this.setupCompositeConfig();
            config.elementsQuantity = {};
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateLayerIntegrity(result, config);
        });
    }

}

module.exports.TestElementsProvider = TestElementsProvider;
