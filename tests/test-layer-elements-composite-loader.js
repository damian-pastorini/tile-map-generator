/**
 *
 * Reldens - Test Layer Elements Composite Loader
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { LayerElementsCompositeLoader } = require('../lib/loader/layer-elements-composite-loader');

class TestLayerElementsCompositeLoader extends BaseMapGeneratorTest
{

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let loader = new LayerElementsCompositeLoader({rootFolder: this.testDataFolder});
            this.assert(loader instanceof LayerElementsCompositeLoader, 'Expected LayerElementsCompositeLoader instance');
            this.assert('function' === typeof loader.load, 'Expected load method');
            this.assert(loader.schemaValidator, 'Expected schema validator to be set');
        });
    }

    async testLoadWithInMemoryTileMapJSON()
    {
        await this.test('load succeeds with in-memory map data and tileMapJSON', async () => {
            let tileMapJSON = {layers: [], tilesets: []};
            let loader = new LayerElementsCompositeLoader({
                rootFolder: this.testDataFolder,
                mapData: {blockMapBorder: true, freeSpaceTilesQuantity: 2},
                tileMapJSON
            });
            let result = await loader.load();
            this.assertEqual(result, true);
            this.assertEqual(loader.mapData.tileMapJSON, tileMapJSON);
            this.assertEqual(loader.mapData.rootFolder, this.testDataFolder);
        });
    }

    async testLoadPayloadWithProvidedTileMapJSON()
    {
        await this.test('loadPayload returns true when tileMapJSON already provided', async () => {
            let loader = new LayerElementsCompositeLoader({
                rootFolder: this.testDataFolder,
                tileMapJSON: {layers: []}
            });
            this.assertEqual(loader.loadPayload(), true);
        });
    }

    async testLoadPayloadReturnsFalseForMissingComposite()
    {
        await this.test('loadPayload returns false when composite file is missing', async () => {
            let loader = new LayerElementsCompositeLoader({rootFolder: this.testDataFolder});
            loader.mapData = {compositeElementsFile: 'non-existent-composite.json'};
            this.assertEqual(loader.loadPayload(), false);
        });
    }

    async testAssignPayloadSetsTileMapJSON()
    {
        await this.test('assignPayload assigns tileMapJSON onto map data', async () => {
            let tileMapJSON = {layers: [1, 2]};
            let loader = new LayerElementsCompositeLoader({
                rootFolder: this.testDataFolder,
                tileMapJSON
            });
            loader.mapData = {};
            loader.assignPayload();
            this.assertEqual(loader.mapData.tileMapJSON, tileMapJSON);
        });
    }

    async testLoadPayloadLoadsCompositeFromFile()
    {
        await this.test('loadPayload loads tileMapJSON from the composite elements file', async () => {
            let loader = new LayerElementsCompositeLoader({rootFolder: this.testDataFolder});
            loader.mapData = {compositeElementsFile: 'reldens-town-composite.json'};
            let result = loader.loadPayload();
            this.assertEqual(result, true, 'Expected loadPayload to succeed');
            this.assert(loader.tileMapJSON, 'Expected tileMapJSON to be set');
            this.assert(Array.isArray(loader.tileMapJSON.layers), 'Expected composite layers parsed');
            this.assert(0 < loader.tileMapJSON.layers.length, 'Expected at least one composite layer');
        });
    }

}

module.exports.TestLayerElementsCompositeLoader = TestLayerElementsCompositeLoader;
