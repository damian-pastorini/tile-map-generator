/**
 *
 * Reldens - Test Layer Elements Loader
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { LayerElementsLoader } = require('../lib/loader/layer-elements-loader');

class TestLayerElementsLoader extends BaseMapGeneratorTest
{

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let loader = new LayerElementsLoader({rootFolder: this.testDataFolder, mapDataFile: 'map.json'});
            this.assert(loader instanceof LayerElementsLoader, 'Expected LayerElementsLoader instance');
            this.assert('function' === typeof loader.load, 'Expected load method');
            this.assertEqual(loader.rootFolder, this.testDataFolder);
            this.assertEqual(loader.mapDataFile, 'map.json');
        });
    }

    async testLoadReturnsFalseWithoutRootFolder()
    {
        await this.test('load returns false when root folder is missing', async () => {
            let loader = new LayerElementsLoader({mapDataFile: 'map.json'});
            let result = await loader.load();
            this.assertEqual(result, false);
        });
    }

    async testLoadMapDataReturnsFalseWithoutFile()
    {
        await this.test('loadMapData returns false when map data file is missing', async () => {
            let loader = new LayerElementsLoader({rootFolder: this.testDataFolder});
            this.assertEqual(loader.loadMapData(), false);
        });
    }

    async testLoadJsonFromFileReturnsFalseWithoutFileName()
    {
        await this.test('loadJsonFromFile returns false when file name is missing', async () => {
            let loader = new LayerElementsLoader({rootFolder: this.testDataFolder});
            this.assertEqual(loader.loadJsonFromFile(false), false);
        });
    }

    async testDefaultPayloadHooks()
    {
        await this.test('Base loadPayload returns true and assignPayload is a no-op', async () => {
            let loader = new LayerElementsLoader({rootFolder: this.testDataFolder});
            this.assertEqual(loader.loadPayload(), true);
            this.assert(!loader.assignPayload(), 'Expected assignPayload to be a no-op');
        });
    }

    async testLoadMapDataReturnsParsedJson()
    {
        await this.test('loadMapData parses an existing map data file', async () => {
            let loader = new LayerElementsLoader({rootFolder: this.testDataFolder, mapDataFile: 'tree.json'});
            let data = loader.loadMapData();
            this.assert(data, 'Expected parsed map data');
            this.assertEqual(data.type, 'map', 'Expected Tiled map type from parsed file');
            this.assert(Array.isArray(data.layers), 'Expected layers array from parsed file');
        });
    }

    async testLoadJsonFromFileReturnsParsedJson()
    {
        await this.test('loadJsonFromFile parses an existing JSON file', async () => {
            let loader = new LayerElementsLoader({rootFolder: this.testDataFolder});
            let json = loader.loadJsonFromFile('tree.json');
            this.assert(json, 'Expected parsed JSON');
            this.assertEqual(json.width, 6, 'Expected tree map width parsed from file');
            this.assertEqual(json.layers[0].name, 'tree-base', 'Expected first layer name parsed from file');
        });
    }

}

module.exports.TestLayerElementsLoader = TestLayerElementsLoader;
