/**
 *
 * Reldens - Test Layer Elements Object Loader
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { LayerElementsObjectLoader } = require('../lib/loader/layer-elements-object-loader');

class TestLayerElementsObjectLoader extends BaseMapGeneratorTest
{

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let loader = new LayerElementsObjectLoader({rootFolder: this.testDataFolder});
            this.assert(loader instanceof LayerElementsObjectLoader, 'Expected LayerElementsObjectLoader instance');
            this.assert('function' === typeof loader.load, 'Expected load method');
            this.assert(loader.schemaValidator, 'Expected schema validator to be set');
        });
    }

    async testLoadWithInMemoryData()
    {
        await this.test('load succeeds with in-memory map data and layer elements', async () => {
            let mapData = this.setupMinimalConfig();
            let layerElements = mapData.layerElements;
            delete mapData.layerElements;
            let loader = new LayerElementsObjectLoader({
                rootFolder: this.testDataFolder,
                mapData,
                layerElements
            });
            let result = await loader.load();
            this.assertEqual(result, true);
            this.assertEqual(loader.mapData.layerElements, layerElements);
            this.assertEqual(loader.mapData.rootFolder, this.testDataFolder);
        });
    }

    async testLoadLayerElementsReturnsFalseWithoutFiles()
    {
        await this.test('loadLayerElements returns false when no layerElementsFiles', async () => {
            let loader = new LayerElementsObjectLoader({rootFolder: this.testDataFolder});
            loader.mapData = {};
            this.assertEqual(loader.loadLayerElements(), false);
        });
    }

    async testLoadPayloadWithProvidedElements()
    {
        await this.test('loadPayload returns true when layer elements already provided', async () => {
            let loader = new LayerElementsObjectLoader({
                rootFolder: this.testDataFolder,
                layerElements: {tree: []}
            });
            this.assertEqual(loader.loadPayload(), true);
        });
    }

    async testFetchLayersJsonFromInvalidFile()
    {
        await this.test('fetchLayersJsonFromMapFile returns false for missing file', async () => {
            let loader = new LayerElementsObjectLoader({rootFolder: this.testDataFolder});
            this.assertEqual(loader.fetchLayersJsonFromMapFile('non-existent-element.json'), false);
        });
    }

    async testFetchLayersJsonFromValidFile()
    {
        await this.test('fetchLayersJsonFromMapFile returns the layers array of a valid map file', async () => {
            let loader = new LayerElementsObjectLoader({rootFolder: this.testDataFolder});
            let layers = loader.fetchLayersJsonFromMapFile('tree.json');
            this.assert(Array.isArray(layers), 'Expected layers array');
            this.assert(0 < layers.length, 'Expected at least one layer');
            this.assertEqual(layers[0].name, 'tree-base', 'Expected first tree layer name');
        });
    }

    async testLoadLayerElementsFromFiles()
    {
        await this.test('loadLayerElements loads layers grouped by element key from files', async () => {
            let loader = new LayerElementsObjectLoader({rootFolder: this.testDataFolder});
            loader.mapData = {layerElementsFiles: {tree: 'tree.json', house1: 'house-001.json'}};
            let result = loader.loadLayerElements();
            this.assert(result, 'Expected layer elements object');
            this.assert(Array.isArray(result.tree), 'Expected tree layers array');
            this.assert(0 < result.tree.length, 'Expected tree layers populated');
            this.assertEqual(result.tree[0].name, 'tree-base', 'Expected tree first layer name');
            this.assert(Array.isArray(result.house1), 'Expected house1 layers array');
        });
    }

    async testLoadLayerElementsSkipsInvalidFiles()
    {
        await this.test('loadLayerElements skips files whose layers cannot be read', async () => {
            let loader = new LayerElementsObjectLoader({rootFolder: this.testDataFolder});
            loader.mapData = {layerElementsFiles: {tree: 'tree.json', missing: 'non-existent-element.json'}};
            let result = loader.loadLayerElements();
            this.assert(result.tree, 'Expected valid tree entry present');
            this.assert(!result.missing, 'Expected missing file to be skipped');
        });
    }

}

module.exports.TestLayerElementsObjectLoader = TestLayerElementsObjectLoader;
