/**
 *
 * Reldens - Test Direct Constructor
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');

class TestDirectConstructor extends BaseMapGeneratorTest
{

    async testDirectConstructorBasic()
    {
        await this.test('Direct constructor basic generation', async () => {
            Math.random = this.seedRandom(12345);
            let config = this.setupBasicConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testDirectConstructorComplex()
    {
        await this.test('Direct constructor complex generation', async () => {
            Math.random = this.seedRandom(54321);
            let config = this.setupComplexConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateElementPlacement(result, config);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testMinimalConfiguration()
    {
        await this.test('Minimal valid configuration', async () => {
            Math.random = this.seedRandom(99999);
            let config = this.setupMinimalConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testBorderConfiguration()
    {
        await this.test('Border configuration validation', async () => {
            Math.random = this.seedRandom(77777);
            let config = this.setupComplexConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            let borderLayer = result.layers.find(layer => layer.name === 'collisions-map-border');
            if(config.blockMapBorder){
                this.assert(borderLayer, 'Should have border layer when blockMapBorder is true');
            }
            this.validateLayerIntegrity(result, config);
        });
    }

    async testDeterministicOutput()
    {
        await this.test('Deterministic output with same seed', async () => {
            let config = this.setupBasicConfig();
            Math.random = this.seedRandom(88888);
            let result1 = await this.testCurrentGeneration(config);
            Math.random = this.seedRandom(88888);
            let result2 = await this.testCurrentGeneration(config);
            this.compareMapOutputs(result1, result2);
        });
    }

}

module.exports.TestDirectConstructor = TestDirectConstructor;
