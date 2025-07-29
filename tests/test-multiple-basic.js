/**
 *
 * Reldens - Test Multiple Basic
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { RandomMapGenerator } = require('../lib/random-map-generator');

class TestMultipleBasic extends BaseMapGeneratorTest
{

    async testMultipleIndependentMaps()
    {
        await this.test('Multiple independent maps generation', async () => {
            Math.random = this.seedRandom(12345);
            let config1 = this.setupBasicConfig();
            config1.mapName = 'map-1';
            let config2 = this.setupBasicConfig();
            config2.mapName = 'map-2';
            config2.groundTile = 2;
            let generator1 = new RandomMapGenerator(config1);
            let generator2 = new RandomMapGenerator(config2);
            let result1 = await generator1.generate();
            let result2 = await generator2.generate();
            this.assertValidMapStructure(result1);
            this.assertValidMapStructure(result2);
            this.assert(result1 !== result2, 'Maps should be different objects');
        });
    }

    async testSequentialMapGeneration()
    {
        await this.test('Sequential map generation', async () => {
            Math.random = this.seedRandom(54321);
            let configs = this.createMultipleConfigs(2);
            let results = [];
            for(let config of configs){
                let generator = new RandomMapGenerator(config);
                let result = await generator.generate();
                this.assertValidMapStructure(result);
                results.push(result);
            }
            this.assertEqual(results.length, 2, 'Should generate 2 maps');
        });
    }

    async testGeneratorReuse()
    {
        await this.test('Generator instance reuse', async () => {
            Math.random = this.seedRandom(55555);
            let generator = new RandomMapGenerator();
            let config1 = this.setupBasicConfig();
            config1.mapName = 'first-map';
            generator.resetInstance(config1);
            let result1 = await generator.generate();
            let config2 = this.setupBasicConfig();
            config2.mapName = 'second-map';
            config2.groundTile = 3;
            generator.resetInstance(config2);
            let result2 = await generator.generate();
            this.assertValidMapStructure(result1);
            this.assertValidMapStructure(result2);
            this.assert(result1 !== result2, 'Results should be different');
        });
    }

    createMultipleConfigs(count)
    {
        let configs = [];
        for(let i = 0; i < count; i++){
            let config = this.setupBasicConfig();
            config.mapName = 'map-' + i;
            config.groundTile = 116 + i;
            configs.push(config);
        }
        return configs;
    }

}

module.exports.TestMultipleBasic = TestMultipleBasic;
