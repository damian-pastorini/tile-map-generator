/**
 *
 * Reldens - Test Map Data Mapper
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapDataMapper } = require('../lib/map/data-mapper');

class TestMapDataMapper extends BaseMapGeneratorTest
{

    buildOptimizedTileset()
    {
        let tileset = {image: 'sheet.png', imageheight: 256, imagewidth: 512};
        tileset.tilecount = 100;
        tileset.columns = 16;
        tileset.margin = 1;
        tileset.spacing = 2;
        tileset.tiles = [];
        return tileset;
    }

    buildElementsProvider()
    {
        let provider = {optimizedFolder: 'generated/optimized'};
        provider.optimizedMap = {tilewidth: 32, tilesets: [this.buildOptimizedTileset()]};
        provider.croppedElements = {tree: []};
        provider.elementsQuantity = {tree: 2};
        provider.groundTile = 116;
        provider.pathTile = 121;
        provider.factor = 1;
        return provider;
    }

    async testFromOptimizedMapReadsTilesetFields()
    {
        let provider = this.buildElementsProvider();
        await this.test('fromOptimizedMap maps tileset fields into result', async () => {
            let result = MapDataMapper.fromOptimizedMap(provider);
            this.assertEqual(result.tileSize, 32, 'tileSize should come from tilewidth');
            this.assertEqual(result.imageHeight, 256, 'imageHeight should come from tileset imageheight');
            this.assertEqual(result.imageWidth, 512, 'imageWidth should come from tileset imagewidth');
            this.assertEqual(result.tileCount, 100, 'tileCount should come from tileset tilecount');
            this.assertEqual(result.columns, 16, 'columns should come from tileset columns');
            this.assertEqual(result.margin, 1, 'margin should come from tileset margin');
            this.assertEqual(result.spacing, 2, 'spacing should come from tileset spacing');
        });
    }

    async testFromOptimizedMapSetsFirstTileset()
    {
        let provider = this.buildElementsProvider();
        await this.test('fromOptimizedMap exposes the first tileset reference', async () => {
            let result = MapDataMapper.fromOptimizedMap(provider);
            this.assertEqual(result.optimizedMapFirstTileset, provider.optimizedMap.tilesets[0], 'Should reference the first tileset');
        });
    }

    async testFromElementsProviderCopiesElementData()
    {
        let provider = this.buildElementsProvider();
        await this.test('fromElementsProvider copies element configuration', async () => {
            let result = MapDataMapper.fromElementsProvider(provider);
            this.assertEqual(result.layerElements, provider.croppedElements, 'layerElements should be cropped elements');
            this.assertDeepEqual(result.elementsQuantity, {tree: 2}, 'elementsQuantity should be carried over');
            this.assertEqual(result.groundTile, 116, 'groundTile should be carried over');
            this.assertEqual(result.pathTile, 121, 'pathTile should be carried over');
        });
    }

    async testFromProviderMergesNamingAndProviderData()
    {
        let provider = this.buildElementsProvider();
        let props = {rootFolder: '', columns: 99};
        await this.test('fromProvider merges naming, optimized map and provider data', async () => {
            let result = MapDataMapper.fromProvider(props, 'overworld', provider);
            this.assertEqual(result.mapName, 'overworld', 'mapName should be set');
            this.assertEqual(result.mapFileName, 'overworld.json', 'mapFileName should append json extension');
            this.assertEqual(result.tileSheetName, 'overworld.png', 'tileSheetName should append png extension');
            this.assertEqual(result.tileSize, 32, 'optimized map data should override props');
            this.assert(0 <= result.tileSheetPath.indexOf('sheet.png'), 'tileSheetPath should include the tileset image');
        });
    }

    async testFromProviderDoesNotMutateProps()
    {
        let provider = this.buildElementsProvider();
        let props = {rootFolder: '', custom: 'value'};
        await this.test('fromProvider clones props instead of mutating them', async () => {
            MapDataMapper.fromProvider(props, 'town', provider);
            this.assert('undefined' === typeof props.mapName, 'Original props should not gain a map name');
        });
    }

}

module.exports.TestMapDataMapper = TestMapDataMapper;
