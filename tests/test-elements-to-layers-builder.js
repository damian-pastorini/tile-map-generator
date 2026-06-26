/**
 *
 * Reldens - Test Elements To Layers Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { ElementsToLayersBuilder } = require('../lib/map/elements-to-layers-builder');
const { ElementsFromLayersLoader } = require('../lib/loader/elements-from-layers-loader');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestElementsToLayersBuilder extends BaseMapGeneratorTest
{

    assertOverPlayerAbove(result)
    {
        let overIndex = result.layers.findIndex((layer) => 'merge-over-player' === layer.name);
        let collisionsOverIndex = result.layers.findIndex((layer) => 'merge-collisions-over-player' === layer.name);
        this.assert(collisionsOverIndex < overIndex, 'merge-over-player must render on top of merge-collisions-over-player');
    }

    assertMapLayersMatch(actual, expected, message)
    {
        let names = actual.map((layer) => layer.name).join(',');
        let expectedNames = expected.map((layer) => layer.name).join(',');
        this.assertEqual(names, expectedNames, message+' - layer order: ['+names+'] vs expected ['+expectedNames+']');
        let diffs = [];
        for(let i = 0; i < expected.length; i++){
            this.collectLayerDiff(diffs, actual[i], expected[i]);
        }
        this.assertEqual(diffs.length, 0, message+' - tile mismatches: '+diffs.join(' | '));
    }

    collectLayerDiff(diffs, actualLayer, expectedLayer)
    {
        for(let i = 0; i < expectedLayer.data.length; i++){
            if(actualLayer.data[i] === expectedLayer.data[i]){
                continue;
            }
            let row = Math.floor(i / expectedLayer.width);
            let col = i % expectedLayer.width;
            diffs.push(expectedLayer.name+' cell '+i+' (r'+row+' c'+col+') got '+actualLayer.data[i]+' expected '+expectedLayer.data[i]);
            break;
        }
    }

    buildOverPlayerPair(instanceId, overTile, collisionsTile)
    {
        return ElementFixtures.buildElement(instanceId, 'tree', 1, {col: overTile.col, row: overTile.row, width: 2, height: 1}, [
            ElementFixtures.buildElementLayer(instanceId + '-collisions-over-player', 'collisions-over-player', [collisionsTile]),
            ElementFixtures.buildElementLayer(instanceId + '-over-player', 'over-player', [overTile])
        ]);
    }

    buildOverPlayerTree(instanceId, col, row, gid)
    {
        return ElementFixtures.buildElement(instanceId, 'tree', 1,
            {col, row, width: 1, height: 1},
            [ElementFixtures.buildElementLayer(instanceId + '-over-player', 'over-player', [{col, row, gid}])]
        );
    }

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
        await this.test('Configured type keys merge non-colliding same-type layers into one clean layer', async () => {
            let result = this.applyTrees(this.buildNonCollidingTreeElements(), ['below-player']);
            this.assertEqual(result.layers.length, 2, 'Ground plus a single merged element layer');
            this.assertEqual(result.layers[1].name, 'merge-below-player', 'Non-colliding same-type layers merge into the type layer');
            this.assertDeepEqual(result.layers[1].data, [200, 0, 0, 100], 'Both element tiles land in the merged layer');
        });
    }

    async testCollidingSameTypeSpillsFrontOnTop()
    {
        await this.test('Colliding same-type layers spill so the front instance is on top', async () => {
            let result = this.applyTrees(this.buildCollidingTreeElements(), ['below-player']);
            this.assertEqual(result.layers.length, 3, 'Ground plus two stacked element layers (spill on overlap)');
            this.assertEqual(result.layers[1].name, 'merge-below-player', 'Back instance stays in the base merged layer');
            this.assertEqual(result.layers[1].data[0], 100, 'Back instance tile is preserved in the lower layer');
            this.assertEqual(result.layers[2].name, 'merge-below-player-2', 'Front instance spills to a layer on top');
            this.assertEqual(result.layers[2].data[0], 200, 'Front instance tile is preserved in the higher layer');
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

    async testMergesCollisionsAcrossElementTypes()
    {
        await this.test('Collision layers from different elements merge into one clean merge-collisions layer', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree-001-collisions', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('building-002-collisions', [0, 0, 0, 0])
            ], 2, 2);
            let mapElements = {elements: [
                ElementFixtures.buildElement('tree-001', 'tree', 1, {col: 0, row: 0, width: 1, height: 1},
                    [ElementFixtures.buildElementLayer('tree-001-collisions', 'collisions', [{col: 0, row: 0, gid: 100}])]
                ),
                ElementFixtures.buildElement('building-002', 'building', 2, {col: 1, row: 1, width: 1, height: 1},
                    [ElementFixtures.buildElementLayer('building-002-collisions', 'collisions', [{col: 1, row: 1, gid: 200}])]
                )
            ]};
            let result = new ElementsToLayersBuilder({autoMergeLayersByKeys: ['collisions']}).apply(mapJson, mapElements);
            let collisionLayers = result.layers.filter((layer) => -1 !== layer.name.indexOf('collisions'));
            this.assertEqual(collisionLayers.length, 1, 'Both element collision layers merge into a single layer');
            this.assertEqual(collisionLayers[0].name, 'merge-collisions', 'Merged collision layer uses the clean type name');
            this.assertEqual(collisionLayers[0].data[0], 100, 'Tree collision tile is preserved');
            this.assertEqual(collisionLayers[0].data[3], 200, 'Building collision tile is preserved');
        });
    }

    async testMergesSpotSegments()
    {
        await this.test('Spot segment layers merge by spot group when "spot" is configured', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('spot_001_dark_grass-s0', [1, 0, 0, 0]),
                ElementFixtures.buildLayer('spot_001_dark_grass-s1', [0, 0, 0, 2])
            ], 2, 2);
            let result = new ElementsToLayersBuilder({autoMergeLayersByKeys: ['spot']}).apply(mapJson, {elements: []});
            let spotLayer = result.layers.find((layer) => 'merge-spot_001_dark_grass' === layer.name);
            this.assert(spotLayer, 'Spot segments should merge into one spot-group layer');
            this.assertDeepEqual(spotLayer.data, [1, 0, 0, 2], 'Both spot tiles land in the merged spot layer');
        });
    }

    async testCorruptDuplicateNamesMergeCleanly()
    {
        await this.test('Corrupted per-instance names still produce a clean merged type layer', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [0, 0, 0, 0]),
                ElementFixtures.buildLayer('tree1-----0021-below-player', [0, 0, 0, 0])
            ], 2, 2);
            let mapElements = {elements: [
                ElementFixtures.buildElement('tree1-----0021', 'tree', 21, {col: 0, row: 0, width: 1, height: 1},
                    [ElementFixtures.buildElementLayer('tree1-----0021-below-player', 'below-player', [{col: 0, row: 0, gid: 100}])]
                )
            ]};
            let result = new ElementsToLayersBuilder({autoMergeLayersByKeys: ['below-player']}).apply(mapJson, mapElements);
            let merged = result.layers.find((layer) => 'merge-below-player' === layer.name);
            this.assert(merged, 'A clean merge-below-player layer should be produced from the corrupted name');
            this.assertEqual(merged.data[0], 100, 'The element tile is preserved');
            let corrupt = result.layers.find((layer) => -1 !== layer.name.indexOf('-----'));
            this.assert(!corrupt, 'No corrupted dash names should remain in the merged output');
        });
    }

    async testDuplicatedElementsMergeWithOverPlayerOnTop()
    {
        await this.test('Duplicated elements merge per type with over-player rendering on top of collisions-over-player', async () => {
            let mapJson = ElementFixtures.buildMap([ElementFixtures.buildLayer('ground', [0, 0, 0, 0])], 2, 2);
            let mapElements = {elements: [
                this.buildOverPlayerPair('tree-001', {col: 0, row: 0, gid: 100}, {col: 0, row: 0, gid: 110}),
                this.buildOverPlayerPair('tree1-001', {col: 1, row: 1, gid: 200}, {col: 1, row: 1, gid: 210})
            ]};
            let result = new ElementsToLayersBuilder({autoMergeLayersByKeys: ['over-player', 'collisions-over-player']})
                .apply(mapJson, mapElements);
            let over = result.layers.find((layer) => 'merge-over-player' === layer.name);
            let collisionsOver = result.layers.find((layer) => 'merge-collisions-over-player' === layer.name);
            this.assert(over, 'Both elements over-player merge into a single layer');
            this.assert(collisionsOver, 'Both elements collisions-over-player merge into a single layer');
            this.assertDeepEqual(over.data, [100, 0, 0, 200], 'over-player holds both duplicates only');
            this.assertDeepEqual(collisionsOver.data, [110, 0, 0, 210], 'collisions-over-player holds both duplicates only');
            this.assertOverPlayerAbove(result);
        });
    }

    async testOverlappingDuplicateSpillsFrontOnTop()
    {
        await this.test('An overlapping duplicate spills so the front instance is on top', async () => {
            let mapJson = ElementFixtures.buildMap([ElementFixtures.buildLayer('ground', [0, 0, 0, 0])], 2, 2);
            let mapElements = {elements: [
                this.buildOverPlayerTree('tree-001', 0, 0, 100),
                this.buildOverPlayerTree('tree1-001', 0, 0, 200)
            ]};
            let result = new ElementsToLayersBuilder({autoMergeLayersByKeys: ['over-player']}).apply(mapJson, mapElements);
            let overLayers = result.layers.filter((layer) => -1 !== layer.name.indexOf('over-player'));
            this.assertEqual(overLayers.length, 2, 'Overlapping duplicate spills into a second over-player layer');
            this.assertEqual(overLayers[0].name, 'merge-over-player', 'Back instance stays in the base over-player layer');
            this.assertEqual(overLayers[0].data[0], 100, 'Back instance tile is preserved in the lower layer');
            this.assertEqual(overLayers[1].name, 'merge-over-player-2', 'Front instance spills to the layer on top');
            this.assertEqual(overLayers[1].data[0], 200, 'Front instance tile is preserved in the higher (later) layer');
        });
    }

    async testFiveTreesMapMergesToExpectedPublishedMap()
    {
        await this.test('Five trees merge into the expected published map (spill only on overlap)', async () => {
            let unmergedPath = FileHandler.joinPaths(this.testDataFolder, 'five-trees-unmerged.json');
            let unmerged = sc.parseJson(FileHandler.readFile(unmergedPath));
            let expectedPath = FileHandler.joinPaths(this.testDataFolder, 'five-trees-merged.json');
            let expected = sc.parseJson(FileHandler.readFile(expectedPath));
            let record = new ElementsFromLayersLoader().load(unmerged);
            let result = new ElementsToLayersBuilder({autoMergeLayersByKeys: ['base', 'collisions', 'over-player']})
                .apply(unmerged, record);
            this.assertDeepEqual(result.layers, expected.layers, 'Merged layers must match five-trees-merged.json exactly');
        });
    }

    async testFiveHousesMergeToExpectedPublishedMap()
    {
        await this.test('Five houses at varied positions merge preserving original layer order', async () => {
            let unmergedPath = FileHandler.joinPaths(this.testDataFolder, 'five-houses-unmerged.json');
            let unmerged = sc.parseJson(FileHandler.readFile(unmergedPath));
            let expectedPath = FileHandler.joinPaths(this.testDataFolder, 'five-houses-merged.json');
            let expected = sc.parseJson(FileHandler.readFile(expectedPath));
            let record = new ElementsFromLayersLoader().load(unmerged);
            let result = new ElementsToLayersBuilder(
                {autoMergeLayersByKeys: ['below-player', 'collisions', 'collisions-over-player', 'over-player']}
            ).apply(unmerged, record);
            this.assertMapLayersMatch(result.layers, expected.layers, 'five-houses-merged.json');
        });
    }
}

module.exports.TestElementsToLayersBuilder = TestElementsToLayersBuilder;
