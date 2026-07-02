/**
 *
 * Reldens - Test Elements Provider
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementsProvider } = require('../lib/generator/elements-provider');

class TestElementsProvider extends BaseMapGeneratorTest
{

    async testConstructorAppliesDefaultsAndOverrides()
    {
        await this.test('constructor applies defaults and prop overrides', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: []}, factor: 3, pathSize: 4});
            this.assertEqual(provider.factor, 3, 'factor override applied');
            this.assertEqual(provider.pathSize, 4, 'pathSize override applied');
            this.assertEqual(provider.transparentColor, '#000000', 'default transparent color');
            this.assertEqual(provider.groundTile, 0, 'default ground tile is zero');
            this.assertDeepEqual(provider.specialLayers, ['ground', 'path', 'ground-variations', 'borders', 'tileset-ref'],
                'special layers default list');
        });
    }

    buildHouseProperties()
    {
        return [
            {name: 'quantity', value: 3},
            {name: 'freeSpaceAround', value: 2},
            {name: 'allowPathsInFreeSpace', value: true},
            {name: 'mapCentered', value: false}
        ];
    }

    buildSplitLayersFixture()
    {
        return [
            {name: 'ground', data: [116, 116]},
            {name: 'ground-variations', data: [5, 0, 6, 5]},
            {name: 'spot-layer-foo-ground-variations-bar', data: [7, 0, 8]},
            {name: 'house-01-below-player', data: [9, 0], properties: this.buildHouseProperties()},
            {name: 'house-01-collisions', data: [10, 0]},
            {name: 'bad', data: [1]}
        ];
    }

    async testSplitByLayerNameGroupsAndProperties()
    {
        await this.test('splitByLayerName groups element layers and captures properties', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: this.buildSplitLayersFixture()}});
            let groups = provider.splitByLayerName();
            this.assert(groups['house-01'], 'house-01 group exists');
            this.assertEqual(groups['house-01'].length, 2, 'two layers grouped under house-01');
            this.assert(!groups['bad'], 'invalid short layer name skipped');
            this.assertEqual(provider.elementsQuantity['house-01'], 3, 'quantity property captured');
            this.assertEqual(provider.elementsFreeSpaceAround['house-01'], 2, 'freeSpaceAround captured');
            this.assertEqual(provider.allowPathsInFreeSpace['house-01'], true, 'allowPathsInFreeSpace captured');
            this.assertEqual(provider.mapCenteredElements['house-01'], false, 'mapCentered captured');
            this.assertDeepEqual(provider.randomGroundTiles, [5, 6], 'ground variations tiles captured');
            this.assertDeepEqual(provider.elementsVariations['foo-bar'], [7, 8], 'spot ground variations captured');
        });
    }

    async testFindMinimumBoundingBox()
    {
        await this.test('findMinimumBoundingBox computes bounds from non-zero tiles', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: []}});
            let layers = [{type: 'tilelayer', width: 4, height: 4, data: [
                0, 0, 0, 0,
                0, 5, 6, 0,
                0, 7, 8, 0,
                0, 0, 0, 0
            ]}];
            let box = provider.findMinimumBoundingBox(layers);
            this.assertEqual(box.minX, 1, 'min X');
            this.assertEqual(box.minY, 1, 'min Y');
            this.assertEqual(box.width, 2, 'bounding width');
            this.assertEqual(box.height, 2, 'bounding height');
        });
    }

    async testCropMapToMinimumArea()
    {
        await this.test('cropMapToMinimumArea crops layers to the bounding box', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: []}});
            let map = {width: 4, height: 4, layers: [{type: 'tilelayer', width: 4, height: 4, data: [
                0, 0, 0, 0,
                0, 5, 6, 0,
                0, 7, 8, 0,
                0, 0, 0, 0
            ]}]};
            let cropped = provider.cropMapToMinimumArea(map);
            this.assertEqual(cropped.width, 2, 'cropped map width');
            this.assertEqual(cropped.height, 2, 'cropped map height');
            this.assertEqual(cropped.layers[0].width, 2, 'cropped layer width');
            this.assertDeepEqual(cropped.layers[0].data, [5, 6, 7, 8], 'cropped layer data');
        });
    }

    async testExpandLayers()
    {
        await this.test('expandLayers pads each layer by expandElementsSize', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: []}});
            provider.expandElementsSize = 1;
            let layers = [{width: 2, height: 2, data: [5, 6, 7, 8]}];
            provider.expandLayers(layers);
            this.assertEqual(layers[0].width, 4, 'width expanded by two');
            this.assertEqual(layers[0].height, 4, 'height expanded by two');
            this.assertDeepEqual(
                layers[0].data,
                [0, 0, 0, 0, 0, 5, 6, 0, 0, 7, 8, 0, 0, 0, 0, 0],
                'layer data padded with border of zeros'
            );
        });
    }

    async testFetchPathTilesMapsTileProperties()
    {
        await this.test('fetchPathTiles maps path, ground, border, surrounding, corner and spot tiles', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: []}});
            provider.optimizedMap = {tilesets: [{firstgid: 1, tiles: [
                {id: 120, properties: [{name: 'key', value: 'pathTile'}]},
                {id: 115, properties: [{name: 'key', value: 'groundTile'}]},
                {id: 50, properties: [{name: 'key', value: 'border-top'}]},
                {id: 60, properties: [{name: 'key', value: 'top-left'}]},
                {id: 70, properties: [{name: 'key', value: 'corner-top-left'}]},
                {id: 80, properties: [{name: 'groundSpots', value: 'spotA,spotB'}]}
            ]}]};
            provider.fetchPathTiles();
            this.assertEqual(provider.pathTile, 121, 'path tile resolved with firstgid offset');
            this.assertEqual(provider.groundTile, 116, 'ground tile resolved');
            this.assertEqual(provider.bordersTiles['top'], 51, 'border-top tile resolved');
            this.assertEqual(provider.surroundingTiles['-1,-1'], 61, 'surrounding top-left mapped');
            this.assertEqual(provider.corners['-1,-1'], 71, 'corner top-left mapped');
            this.assertEqual(provider.groundSpots['spotA'], 81, 'ground spot A mapped');
            this.assertEqual(provider.groundSpots['spotB'], 81, 'ground spot B mapped');
        });
    }

    async testFetchPathTilesCollectsMultipleGroundTiles()
    {
        await this.test('fetchPathTiles collects multiple ground tiles and resets the single ground tile', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: []}});
            provider.optimizedMap = {tilesets: [{firstgid: 1, tiles: [
                {id: 115, properties: [{name: 'key', value: 'groundTile'}]},
                {id: 200, properties: [{name: 'key', value: 'groundTile'}]}
            ]}]};
            provider.fetchPathTiles();
            this.assert(-1 !== provider.groundTiles.indexOf(116), 'first ground tile collected');
            this.assert(-1 !== provider.groundTiles.indexOf(201), 'second ground tile collected');
            this.assertEqual(provider.groundTile, 0, 'single ground tile reset to zero when multiple exist');
        });
    }

    async testFetchPathTilesReturnsEarlyWithoutTiles()
    {
        await this.test('fetchPathTiles returns early when the tileset has no tiles', async () => {
            let provider = new ElementsProvider({tileMapJSON: {layers: []}});
            provider.optimizedMap = {tilesets: [{firstgid: 1}]};
            provider.fetchPathTiles();
            this.assertEqual(provider.groundTile, 0, 'ground tile untouched');
            this.assertEqual(typeof provider.pathTile, 'undefined', 'path tile never assigned');
            this.assertEqual(typeof provider.surroundingTiles, 'undefined', 'surrounding tiles never assigned');
        });
    }

    async testFromElementsProviderWorkflow()
    {
        await this.test('fromElementsProvider workflow', async () => {
            Math.random = this.seedRandom(11111);
            let config = this.setupCompositeConfig();
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateElementPlacement(result, config);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testElementsWithCustomProperties()
    {
        await this.test('Elements with custom properties', async () => {
            Math.random = this.seedRandom(22222);
            let config = this.setupCompositeConfig();
            config.elementsFreeSpaceAround = {'house-01': 2, 'tree-base': 1};
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateElementPlacement(result, config);
            this.validateLayerIntegrity(result, config);
        });
    }

    async testElementsProviderWithoutElements()
    {
        await this.test('Elements provider without elements', async () => {
            Math.random = this.seedRandom(33333);
            let config = this.setupCompositeConfig();
            config.elementsQuantity = {};
            let result = await this.testCurrentGeneration(config);
            this.assertValidMapStructure(result);
            this.validateLayerIntegrity(result, config);
        });
    }

}

module.exports.TestElementsProvider = TestElementsProvider;
