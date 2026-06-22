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

    buildTwoTreeMap()
    {
        return ElementFixtures.buildMap([
            ElementFixtures.buildLayer('ground', [0, 0, 0, 0]),
            ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 0, 0]),
            ElementFixtures.buildLayer('tree-002-below-player', [0, 0, 0, 0])
        ], 2, 2);
    }

    buildBelowPlayerTree(instanceId, index, col, row, gid)
    {
        return ElementFixtures.buildElement(instanceId, 'tree', index,
            {col, row, width: 1, height: 1},
            [ElementFixtures.buildElementLayer(instanceId + '-below-player', 'below-player', [
                {col, row, gid}
            ])]
        );
    }

    async testRebuildsElementLayerFromRecord()
    {
        await this.test('Element layer is rebuilt and merged from the record tiles', async () => {
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
            let treeLayer = result.layers.find((layer) => 'merge-tree-001-below-player' === layer.name);
            this.assert(treeLayer, 'Merged element layer should exist');
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
        await this.test('Non-colliding same-type element layers merge in record order', async () => {
            let mapJson = this.buildTwoTreeMap();
            let mapElements = {
                elements: [
                    this.buildBelowPlayerTree('tree-002', 2, 0, 0, 200),
                    this.buildBelowPlayerTree('tree-001', 1, 1, 1, 100)
                ]
            };
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            this.assertEqual(result.layers.length, 2, 'Ground plus a single merged element layer');
            this.assertEqual(result.layers[0].name, 'ground', 'Ground stays first');
            this.assertEqual(
                result.layers[1].name,
                'merge-tree-002-below-player-tree-001-below-player',
                'Non-colliding same-type layers merge in record order'
            );
            this.assertDeepEqual(result.layers[1].data, [200, 0, 0, 100], 'Both element tiles land in the merged layer');
        });
    }

    async testCollidingSameTypeStaySeparate()
    {
        await this.test('Colliding same-type element layers stay separate in record order', async () => {
            let mapJson = this.buildTwoTreeMap();
            let mapElements = {
                elements: [
                    this.buildBelowPlayerTree('tree-001', 1, 0, 0, 100),
                    this.buildBelowPlayerTree('tree-002', 2, 0, 0, 200)
                ]
            };
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            this.assertEqual(result.layers.length, 3, 'Ground plus two separate element layers');
            this.assertEqual(result.layers[1].name, 'merge-tree-001-below-player', 'First colliding element stays first');
            this.assertEqual(result.layers[2].name, 'merge-tree-002-below-player', 'Second colliding element stays after');
            this.assertEqual(result.layers[1].data[0], 100, 'First element keeps its tile');
            this.assertEqual(result.layers[2].data[0], 200, 'Second element keeps its tile');
        });
    }

    async testDifferentTypesDoNotMerge()
    {
        await this.test('Element layers of different types are not merged together', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree-001-over-player', [0, 0, 0, 0])
            ], 2, 2);
            let mapElements = {
                elements: [ElementFixtures.buildElement('tree-001', 'tree', 1,
                    {col: 0, row: 0, width: 1, height: 2},
                    [
                        ElementFixtures.buildElementLayer('tree-001-below-player', 'below-player', [
                            {col: 0, row: 1, gid: 100}
                        ]),
                        ElementFixtures.buildElementLayer('tree-001-over-player', 'over-player', [
                            {col: 0, row: 0, gid: 101}
                        ])
                    ]
                )]
            };
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            this.assertEqual(result.layers.length, 3, 'Ground plus one layer per element type');
            this.assertEqual(result.layers[1].name, 'merge-tree-001-below-player', 'Below-player group comes first');
            this.assertEqual(result.layers[2].name, 'merge-tree-001-over-player', 'Over-player group stays separate');
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
