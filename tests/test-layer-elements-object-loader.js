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

}

module.exports.TestLayerElementsObjectLoader = TestLayerElementsObjectLoader;
