/**
 *
 * Reldens - Test Multiple With Associations By Loader Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MultipleWithAssociationsByLoaderGenerator } = require('../lib/generator/multiple-with-associations-by-loader-generator');

class TestMultipleWithAssociationsByLoaderGenerator extends BaseMapGeneratorTest
{

    async testConstruction()
    {
        await this.test('Constructs and exposes expected method and state', async () => {
            let generator = new MultipleWithAssociationsByLoaderGenerator({loaderData: {rootFolder: this.testDataFolder}});
            this.assert(
                generator instanceof MultipleWithAssociationsByLoaderGenerator,
                'Expected MultipleWithAssociationsByLoaderGenerator instance'
            );
            this.assert('function' === typeof generator.generate, 'Expected generate method');
            this.assertDeepEqual(generator.generators, {});
            this.assertDeepEqual(generator.generatedMaps, {});
            this.assertDeepEqual(generator.associatedMaps, {});
        });
    }

    async testGenerateReturnsFalseWithoutLoaderData()
    {
        await this.test('generate returns false when loader data is undefined', async () => {
            let generator = new MultipleWithAssociationsByLoaderGenerator({});
            let result = await generator.generate();
            this.assertEqual(result, false);
        });
    }

}

module.exports.TestMultipleWithAssociationsByLoaderGenerator = TestMultipleWithAssociationsByLoaderGenerator;
