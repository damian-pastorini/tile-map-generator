/**
 *
 * Reldens - Test Multiple With Associations By Loader Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MultipleWithAssociationsByLoaderGenerator } = require('../lib/generator/multiple-with-associations-by-loader-generator');
const { RandomMapGenerator } = require('../lib/random-map-generator');
const { AssociatedMaps } = require('../lib/generator/associated-maps');
const { FileHandler } = require('@reldens/server-utils');

class TestMultipleWithAssociationsByLoaderGenerator extends BaseMapGeneratorTest
{

    async testGenerateRunsTownAndDoorAssociations()
    {
        let examplesFolder = FileHandler.joinPaths(this.testDataFolder, '..', '..', 'examples', 'layer-elements-composite');
        let generatedFolder = FileHandler.joinPaths(this.testDataFolder, 'generated-with-associations');
        let mapData = FileHandler.fetchFileJson(
            FileHandler.joinPaths(examplesFolder, 'map-composite-data-with-associations.json')
        );
        mapData.mapsInformation = [{mapName: 'assoc-town-001', mapTitle: 'Town 1'}];
        await this.test('generate produces the town map then spawns its door-linked interior sub-maps', async () => {
            Math.random = this.seedRandom(86420);
            try {
                let generator = new MultipleWithAssociationsByLoaderGenerator({
                    loaderData: {rootFolder: examplesFolder, generatedFolder, mapData}
                });
                await generator.generate();
                this.assert(
                    generator.generators['assoc-town-001'] instanceof RandomMapGenerator,
                    'the main town generator must be a real RandomMapGenerator instance'
                );
                this.assertValidMapStructure(generator.generatedMaps['assoc-town-001']);
                let coordinator = generator.associatedMaps['assoc-town-001'];
                this.assert(coordinator instanceof AssociatedMaps, 'an AssociatedMaps coordinator must be created per town');
                let interiorGenerators = Object.keys(coordinator.generators);
                this.assert(0 < interiorGenerators.length, 'the matched town doors must spawn interior sub-map generators');
                let interiorMaps = Object.keys(coordinator.generatedSubMaps);
                this.assert(0 < interiorMaps.length, 'the door-linked interior sub-maps must be generated and recorded');
                let hasHouseInterior = interiorMaps.some(name => -1 !== name.indexOf('house'));
                this.assert(hasHouseInterior, 'interior sub-map names must derive from the fused house change-points layers');
                this.assertOptimizedFolderCleaned(generatedFolder);
            } finally {
                this.restoreMathRandom();
            }
        });
    }

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
