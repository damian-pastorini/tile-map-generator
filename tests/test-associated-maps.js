/**
 *
 * Reldens - Test Associated Maps
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { AssociatedMaps } = require('../lib/generator/associated-maps');

class TestAssociatedMaps extends BaseMapGeneratorTest
{

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let associatedMaps = new AssociatedMaps();
            this.assert(associatedMaps instanceof AssociatedMaps, 'Expected AssociatedMaps instance');
            this.assert('function' === typeof associatedMaps.generate, 'Expected generate method');
            this.assertDeepEqual(associatedMaps.generators, {});
            this.assertDeepEqual(associatedMaps.generatedSubMaps, {});
        });
    }

    async testFetchPropertiesFromLayerEmpty()
    {
        await this.test('fetchPropertiesFromLayer returns empty object without properties', async () => {
            let associatedMaps = new AssociatedMaps();
            this.assertDeepEqual(associatedMaps.fetchPropertiesFromLayer({}), {});
        });
    }

    async testFetchPropertiesFromLayerMapped()
    {
        await this.test('fetchPropertiesFromLayer maps name to value pairs', async () => {
            let associatedMaps = new AssociatedMaps();
            let layer = {properties: [
                {name: 'subMapName', value: 'cave'},
                {name: 'downFloors', value: 2}
            ]};
            let mapped = associatedMaps.fetchPropertiesFromLayer(layer);
            this.assertEqual(mapped.subMapName, 'cave');
            this.assertEqual(mapped.downFloors, 2);
        });
    }

    async testGenerateSubMapNameFromProperty()
    {
        await this.test('generateSubMapName uses subMapName property when present', async () => {
            let associatedMaps = new AssociatedMaps();
            let layer = {name: 'house-001-change-points'};
            let name = associatedMaps.generateSubMapName(
                layer,
                {subMapName: 'cave'},
                'town-01',
                {elementNumber: 3}
            );
            this.assertEqual(name, 'town-01-cave-n3');
        });
    }

    async testGenerateSubMapNameFromLayerName()
    {
        await this.test('generateSubMapName fuses layer name parts when no property', async () => {
            let associatedMaps = new AssociatedMaps();
            let layer = {name: 'house-001-change-points'};
            let name = associatedMaps.generateSubMapName(layer, {}, 'town-01', {elementNumber: 1});
            this.assertEqual(name, 'town-01-house-001-n1');
        });
    }

    async testFetchSubMapTitleCombination()
    {
        await this.test('fetchSubMapTitle combines map title, element title and number', async () => {
            let associatedMaps = new AssociatedMaps();
            let mainMapGenerator = {fetchMapProperty: () => ({value: 'Town'})};
            let title = associatedMaps.fetchSubMapTitle(
                mainMapGenerator,
                {elementTitle: 'House'},
                {elementNumber: 2}
            );
            this.assertEqual(title, 'Town - House-2');
        });
    }

    async testFetchSubMapTitleEmpty()
    {
        await this.test('fetchSubMapTitle returns empty when nothing provided', async () => {
            let associatedMaps = new AssociatedMaps();
            let mainMapGenerator = {fetchMapProperty: () => ({value: ''})};
            let title = associatedMaps.fetchSubMapTitle(mainMapGenerator, {}, {});
            this.assertEqual(title, '');
        });
    }

    async testLoadTileMapJSONMissingReturnsFalse()
    {
        await this.test('loadTileMapJSON returns false for missing composite file', async () => {
            let associatedMaps = new AssociatedMaps();
            let result = associatedMaps.loadTileMapJSON(
                this.testDataFolder,
                {compositeFileNames: 'non-existent-composite-file'}
            );
            this.assertEqual(result, false);
        });
    }

}

module.exports.TestAssociatedMaps = TestAssociatedMaps;
