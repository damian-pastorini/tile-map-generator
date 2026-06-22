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

    buildSingleTreeMap(groundData)
    {
        return ElementFixtures.buildMap([
            ElementFixtures.buildLayer('ground', groundData),
            ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 0, 0])
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

    buildNonCollidingTreeElements()
    {
        return {
            elements: [
                this.buildBelowPlayerTree('tree-002', 2, 0, 0, 200),
                this.buildBelowPlayerTree('tree-001', 1, 1, 1, 100)
            ]
        };
    }

    buildCollidingTreeElements()
    {
        return {
            elements: [
                this.buildBelowPlayerTree('tree-001', 1, 0, 0, 100),
                this.buildBelowPlayerTree('tree-002', 2, 0, 0, 200)
            ]
        };
    }

    applyTrees(mapElements, autoMergeLayersByKeys)
    {
        return new ElementsToLayersBuilder({autoMergeLayersByKeys}).apply(
            ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree-001-below-player', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree-002-below-player', [0, 0, 0, 0])
            ], 2, 2),
            mapElements
        );
    }

    async testRebuildsElementLayerUnmergedByDefault()
    {
        await this.test('Element layer is rebuilt un-merged from the record tiles by default', async () => {
            let mapJson = this.buildSingleTreeMap([1, 1, 1, 1]);
            let mapElements = {elements: [this.buildBelowPlayerTree('tree-001', 1, 1, 1, 100)]};
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            let treeLayer = result.layers.find((layer) => 'tree-001-below-player' === layer.name);
            this.assert(treeLayer, 'Un-merged element layer should exist');
            this.assertEqual(treeLayer.data.length, 4, 'Layer data should cover the full map');
            this.assertEqual(treeLayer.data[3], 100, 'Tile should be placed at row 1 col 1');
            this.assertEqual(treeLayer.width, 2, 'Layer width should match map width');
            this.assertEqual(treeLayer.height, 2, 'Layer height should match map height');
        });
    }

    async testStaticLayersKept()
    {
        await this.test('Static layers are kept untouched', async () => {
            let mapJson = this.buildSingleTreeMap([1, 2, 3, 4]);
            let mapElements = {elements: [this.buildBelowPlayerTree('tree-001', 1, 0, 0, 100)]};
            let result = new ElementsToLayersBuilder().apply(mapJson, mapElements);
            this.assertEqual(result.layers[0].name, 'ground', 'Ground should stay first');
            this.assertDeepEqual(result.layers[0].data, [1, 2, 3, 4], 'Ground data should be untouched');
        });
    }

    async testElementLayersFollowRecordOrderUnmerged()
    {
        await this.test('Element layers are emitted un-merged in record order by default', async () => {
            let result = this.applyTrees(this.buildNonCollidingTreeElements(), []);
            this.assertEqual(result.layers.length, 3, 'Ground plus two un-merged element layers');
            this.assertEqual(result.layers[0].name, 'ground', 'Ground stays first');
            this.assertEqual(result.layers[1].name, 'tree-002-below-player', 'First record element comes first');
            this.assertEqual(result.layers[2].name, 'tree-001-below-player', 'Second record element comes second');
        });
    }

    async testMergesNonCollidingWhenConfigured()
    {
        await this.test('Configured keys merge non-colliding same-type layers in record order', async () => {
            let result = this.applyTrees(this.buildNonCollidingTreeElements(), ['below-player']);
            this.assertEqual(result.layers.length, 2, 'Ground plus a single merged element layer');
            this.assertEqual(
                result.layers[1].name,
                'merge-tree-002-below-player-tree-001-below-player',
                'Non-colliding same-type layers merge in record order'
            );
            this.assertDeepEqual(result.layers[1].data, [200, 0, 0, 100], 'Both element tiles land in the merged layer');
        });
    }

    async testCollidingStaySeparateWhenConfigured()
    {
        await this.test('Configured keys keep colliding same-type layers separate', async () => {
            let result = this.applyTrees(this.buildCollidingTreeElements(), ['below-player']);
            this.assertEqual(result.layers.length, 3, 'Ground plus two separate element layers');
            this.assertEqual(result.layers[1].name, 'merge-tree-001-below-player', 'First colliding element stays first');
            this.assertEqual(result.layers[2].name, 'merge-tree-002-below-player', 'Second colliding element stays after');
            this.assertEqual(result.layers[1].data[0], 100, 'First element keeps its tile');
            this.assertEqual(result.layers[2].data[0], 200, 'Second element keeps its tile');
        });
    }

    async testEmptyRecordDropsElementLayers()
    {
        await this.test('Empty record keeps static layers and drops element layers', async () => {
            let mapJson = this.buildSingleTreeMap([1, 1, 1, 1]);
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
