/**
 *
 * Reldens - Test Multiple By Loader Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MultipleByLoaderGenerator } = require('../lib/generator/multiple-by-loader-generator');

class TestMultipleByLoaderGenerator extends BaseMapGeneratorTest
{

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
