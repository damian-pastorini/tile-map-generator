/**
 *
 * Reldens - Test Integration
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');

class TestIntegration extends BaseMapGeneratorTest
{

    async testEndToEndBasicWorkflow()
    {
        await this.test('End-to-end basic workflow', async () => {
            Math.random = this.seedRandom(12345);
            let config = this.setupComplexConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateElementPlacement(result, config);
            this.validatePathConnectivity(result, config);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testGoldenReferenceComparison()
    {
        await this.test('Golden reference comparison', async () => {
            Math.random = this.seedRandom(555555);
            let config = this.setupBasicConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.assert(result.layers.length >= 1, 'Should have at least ground layer');
            let groundLayer = result.layers.find(layer => layer.name === 'ground');
            this.assert(groundLayer, 'Should have ground layer');
            this.validateLayerIntegrity(result, config);
        });
    }

    async testMultipleSeedsConsistency()
    {
        await this.test('Multiple seeds consistency', async () => {
            let seeds = [111, 222, 333];
            let results = [];
            let config = this.setupBasicConfig();
            for(let seed of seeds){
                Math.random = this.seedRandom(seed);
                let result = await this.testCurrentGeneration(config);
                this.assertValidMapStructure(result);
                results.push(result);
            }
            for(let result of results){
                this.validateLayerIntegrity(result, config);
            }
        });
    }

    async testPerformanceBenchmark()
    {
        await this.test('Performance benchmark', async () => {
            Math.random = this.seedRandom(99999);
            let config = this.setupBasicConfig();
            let startTime = Date.now();
            let result = await this.testCurrentGeneration(config);
            let endTime = Date.now();
            let duration = endTime - startTime;
            this.assertValidMapStructure(result);
            this.assert(duration < 10000, 'Map generation should complete within 10 seconds');
            this.validateLayerIntegrity(result, config);
        });
    }

}

module.exports.TestIntegration = TestIntegration;
