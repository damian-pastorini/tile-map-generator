/**
 *
 * Reldens - Test Multiple By Loader Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MultipleByLoaderGenerator } = require('../lib/generator/multiple-by-loader-generator');
const { RandomMapGenerator } = require('../lib/random-map-generator');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestMultipleByLoaderGenerator extends BaseMapGeneratorTest
{

    async testGenerateProducesMapsFromCompositeAssets()
    {
        let examplesFolder = FileHandler.joinPaths(this.testDataFolder, '..', '..', 'examples', 'layer-elements-composite');
        let generatedFolder = FileHandler.joinPaths(this.testDataFolder, 'generated-multiple');
        let mapData = FileHandler.fetchFileJson(
            FileHandler.joinPaths(examplesFolder, 'map-composite-data-with-names.json')
        );
        mapData.mapNames = ['loader-town-001'];
        mapData.factor = 1;
        await this.test('generate builds a RandomMapGenerator and a valid map for each configured name', async () => {
            Math.random = this.seedRandom(13131);
            try {
                let generator = new MultipleByLoaderGenerator({
                    loaderData: {rootFolder: examplesFolder, generatedFolder, mapData}
                });
                let result = await generator.generate();
                this.assert(sc.isObject(result), 'generate must return the generators map keyed by map name');
                this.assert(
                    result['loader-town-001'] instanceof RandomMapGenerator,
                    'each configured name must map to a real RandomMapGenerator instance'
                );
                this.assertValidMapStructure(generator.generatedMaps['loader-town-001']);
                this.assert(
                    0 < generator.generatedMaps['loader-town-001'].layers.length,
                    'the generated map must contain composed layers'
                );
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testGenerateReturnsFalseWithEmptyNames()
    {
        let examplesFolder = FileHandler.joinPaths(this.testDataFolder, '..', '..', 'examples', 'layer-elements-composite');
        let mapData = FileHandler.fetchFileJson(
            FileHandler.joinPaths(examplesFolder, 'map-composite-data-with-names.json')
        );
        mapData.mapNames = [];
        await this.test('generate returns false when the loaded map data defines no map names', async () => {
            let generator = new MultipleByLoaderGenerator({loaderData: {rootFolder: examplesFolder, mapData}});
            let result = await generator.generate();
            this.assertEqual(result, false, 'An empty map names list must short-circuit generation to false');
        });
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected method and state', async () => {
            let generator = new MultipleByLoaderGenerator({loaderData: {rootFolder: this.testDataFolder}});
            this.assert(generator instanceof MultipleByLoaderGenerator, 'Expected MultipleByLoaderGenerator instance');
            this.assert('function' === typeof generator.generate, 'Expected generate method');
            this.assertDeepEqual(generator.generators, {});
            this.assertDeepEqual(generator.generatedMaps, {});
        });
    }

    async testGenerateReturnsFalseWithoutLoaderData()
    {
        await this.test('generate returns false when loader data is undefined', async () => {
            let generator = new MultipleByLoaderGenerator({});
            let result = await generator.generate();
            this.assertEqual(result, false);
        });
    }

}

module.exports.TestMultipleByLoaderGenerator = TestMultipleByLoaderGenerator;
