/**
 *
 * Reldens - Test Elements To Layers Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { ElementsToLayersBuilder } = require('../lib/map/elements-to-layers-builder');

class TestElementsToLayersBuilder extends BaseMapGeneratorTest
{

    async testRebuildsElementLayerFromRecord()
    {
        await this.test('Element layer is rebuilt from the record tiles', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [1, 1, 1, 1]),
                ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 0, 0])
            ], 2, 2);
            let mapElements = {
                elements: [ElementFixtures.buildElement('tree-001', 'tree', 1,
                    {col: 1, row: 1, width: 1, height: 1},
                    [ElementFixtures.buildElementLayer('tree-001-below-player', 'below-player', [
                        {col: 1, row: 1, gid: 100}
                    ])]
                )]
            };
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            let treeLayer = result.layers.find((layer) => 'tree-001-below-player' === layer.name);
            this.assert(treeLayer, 'Tree layer should exist');
            this.assertEqual(treeLayer.data.length, 4, 'Layer data should cover the full map');
            this.assertEqual(treeLayer.data[3], 100, 'Tile should be placed at row 1 col 1');
            this.assertEqual(treeLayer.width, 2, 'Layer width should match map width');
            this.assertEqual(treeLayer.height, 2, 'Layer height should match map height');
        });
    }

    async testStaticLayersKept()
    {
        await this.test('Static layers are kept untouched', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [1, 2, 3, 4]),
                ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 0, 0])
            ], 2, 2);
            let mapElements = {
                elements: [ElementFixtures.buildElement('tree-001', 'tree', 1,
                    {col: 0, row: 0, width: 1, height: 1},
                    [ElementFixtures.buildElementLayer('tree-001-below-player', 'below-player', [
                        {col: 0, row: 0, gid: 100}
                    ])]
                )]
            };
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            this.assertEqual(result.layers[0].name, 'ground', 'Ground should stay first');
            this.assertDeepEqual(result.layers[0].data, [1, 2, 3, 4], 'Ground data should be untouched');
        });
    }

    async testElementLayersFollowRecordOrder()
    {
        await this.test('Element layers are emitted in record order', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree-002-below-player', [0, 0, 0, 0])
            ], 2, 2);
            let mapElements = {
                elements: [
                    ElementFixtures.buildElement('tree-002', 'tree', 2,
                        {col: 0, row: 0, width: 1, height: 1},
                        [ElementFixtures.buildElementLayer('tree-002-below-player', 'below-player', [
                            {col: 0, row: 0, gid: 200}
                        ])]
                    ),
                    ElementFixtures.buildElement('tree-001', 'tree', 1,
                        {col: 1, row: 1, width: 1, height: 1},
                        [ElementFixtures.buildElementLayer('tree-001-below-player', 'below-player', [
                            {col: 1, row: 1, gid: 100}
                        ])]
                    )
                ]
            };
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            this.assertEqual(result.layers[0].name, 'ground', 'Ground stays first');
            this.assertEqual(result.layers[1].name, 'tree-002-below-player', 'First record element comes first');
            this.assertEqual(result.layers[2].name, 'tree-001-below-player', 'Second record element comes second');
        });
    }

    async testEmptyRecordDropsElementLayers()
    {
        await this.test('Empty record keeps static layers and drops element layers', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [1, 1, 1, 1]),
                ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 100, 0])
            ], 2, 2);
            let result = new ElementsToLayersBuilder().apply(mapJson, {elements: []});
            this.assertEqual(result.layers.length, 1, 'Only the static layer should remain');
            this.assertEqual(result.layers[0].name, 'ground', 'Ground should remain');
        });
    }

    async testMissingElementsReturnsMapUnchanged()
    {
        await this.test('Missing elements returns the map unchanged', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [1, 1, 1, 1])
            ], 2, 2);
            let result = new ElementsToLayersBuilder().apply(mapJson, {});
            this.assertEqual(result.layers.length, 1, 'Layers should be unchanged');
            this.assertEqual(result.layers[0].name, 'ground', 'Ground should be unchanged');
        });
    }
}

module.exports.TestElementsToLayersBuilder = TestElementsToLayersBuilder;
