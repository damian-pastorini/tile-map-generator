/**
 *
 * Reldens - Test Associations
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { RandomMapGenerator } = require('../lib/random-map-generator');

class TestAssociations extends BaseMapGeneratorTest
{

    async testBasicAssociation()
    {
        await this.test('Basic association generation', async () => {
            Math.random = this.seedRandom(12345);
            let config = this.setupBasicConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
        });
    }

    async testFloorDataPersistence()
    {
        await this.test('Floor data persistence across maps', async () => {
            Math.random = this.seedRandom(99999);
            let config = this.setupBasicConfig();
            config.mapName = 'floor-1';
            let generator = new RandomMapGenerator(config);
            let result = await generator.generate();
            this.assertValidMapStructure(result);
        });
    }

}

module.exports.TestAssociations = TestAssociations;
