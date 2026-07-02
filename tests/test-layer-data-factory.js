/**
 *
 * Reldens - Test Layer Data Factory
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class TestLayerDataFactory extends BaseMapGeneratorTest
{

    async testCreateEmptyLayerData()
    {
        let factory = new LayerDataFactory();
        await this.test('createEmptyLayerData returns a zero-filled array of the proper length', async () => {
            let data = factory.createEmptyLayerData(3, 2);
            this.assertEqual(data.length, 6, 'length is width times height');
            this.assertDeepEqual(data, [0, 0, 0, 0, 0, 0], 'all cells are zero');
        });
    }

    async testTileIndexAndReverse()
    {
        let factory = new LayerDataFactory();
        await this.test('tileIndex computes the flat index from row and column', async () => {
            this.assertEqual(factory.tileIndex(2, 1, 4), 9, 'index is row times width plus column');
        });
        await this.test('rowAndColumnByTileIndex reverses the flat index', async () => {
            let position = factory.rowAndColumnByTileIndex(9, 4);
            this.assertEqual(position.row, 2, 'row recovered');
            this.assertEqual(position.column, 1, 'column recovered');
        });
    }

    async testWriteTilesToData()
    {
        let factory = new LayerDataFactory();
        await this.test('writeTilesToData writes provided values at tile positions', async () => {
            let data = factory.createEmptyLayerData(3, 3);
            let tiles = [{row: 0, col: 1, gid: 50}, {row: 2, col: 2, gid: 70}];
            factory.writeTilesToData(data, tiles, 3, tile => tile.gid);
            this.assertEqual(data[1], 50, 'first tile written');
            this.assertEqual(data[8], 70, 'second tile written');
        });
    }

    async testMergeTileArrays()
    {
        let factory = new LayerDataFactory();
        await this.test('mergeTileArrays keeps base non-zero tiles and fills zeros from overlay', async () => {
            let merged = factory.mergeTileArrays([1, 0, 3, 0], [9, 8, 7, 6]);
            this.assertDeepEqual(merged, [1, 8, 3, 6], 'zeros replaced by overlay values');
        });
    }

    async testBuildTileLayer()
    {
        let factory = new LayerDataFactory();
        await this.test('buildTileLayer returns a Tiled-compatible layer object', async () => {
            let layer = factory.buildTileLayer('ground', [0, 1], 2, 1);
            this.assertEqual(layer.name, 'ground', 'name set');
            this.assertEqual(layer.type, 'tilelayer', 'type is tilelayer');
            this.assertEqual(layer.width, 2, 'width set');
            this.assertEqual(layer.height, 1, 'height set');
            this.assertEqual(layer.visible, true, 'layer visible');
            this.assertEqual(layer.opacity, 1, 'opacity is one');
            this.assertDeepEqual(layer.data, [0, 1], 'data preserved');
        });
    }

    async testPadLayerData()
    {
        let factory = new LayerDataFactory();
        await this.test('padLayerData expands the grid and offsets the original data', async () => {
            let result = factory.padLayerData([5], 1, 1, 1);
            this.assertEqual(result.width, 3, 'width grows by two times extra tiles');
            this.assertEqual(result.height, 3, 'height grows by two times extra tiles');
            this.assertEqual(result.data.length, 9, 'data length matches new size');
            this.assertEqual(result.data[4], 5, 'original tile moved to padded center');
        });
    }

    async testForEachMapCell()
    {
        let factory = new LayerDataFactory();
        await this.test('forEachMapCell visits every cell with column, row and index', async () => {
            let visited = [];
            factory.forEachMapCell(2, 2, (column, row, index) => {
                visited.push({column, row, index});
            });
            this.assertEqual(visited.length, 4, 'all four cells visited');
            this.assertDeepEqual(visited[3], {column: 1, row: 1, index: 3}, 'last cell carries proper index');
        });
    }

    async testHasTileCollision()
    {
        let factory = new LayerDataFactory();
        await this.test('hasTileCollision returns false when no cell holds two non-zero tiles', async () => {
            this.assertEqual(factory.hasTileCollision([1, 0, 0], [0, 0, 2]), false, 'no shared non-zero cell');
        });
        await this.test('hasTileCollision returns true when a cell holds two non-zero tiles', async () => {
            this.assertEqual(factory.hasTileCollision([1, 0, 3], [0, 0, 2]), true, 'shared non-zero cell at index two');
        });
    }

    async testNameSubstringGroup()
    {
        let factory = new LayerDataFactory();
        await this.test('nameSubstringGroup returns the matchKey when the name contains it', async () => {
            this.assertEqual(factory.nameSubstringGroup({name: 'tree-base'}, 'tree'), 'tree', 'matching name returns key');
        });
        await this.test('nameSubstringGroup returns null when the name lacks the matchKey', async () => {
            this.assertEqual(factory.nameSubstringGroup({name: 'ground'}, 'tree'), null, 'non-matching name returns null');
        });
    }

    async testMergedGroupLayerName()
    {
        let factory = new LayerDataFactory();
        await this.test('mergedGroupLayerName drops the suffix for the first bucket', async () => {
            this.assertEqual(factory.mergedGroupLayerName('tree', 1), 'merge-tree', 'first bucket has no number suffix');
        });
        await this.test('mergedGroupLayerName appends the count for later buckets', async () => {
            this.assertEqual(factory.mergedGroupLayerName('tree', 3), 'merge-tree-3', 'later bucket appends its count');
        });
    }

    async testMergeLayersByNameSubstring()
    {
        let factory = new LayerDataFactory();
        await this.test('mergeLayersByNameSubstring returns layers untouched without a matchKey', async () => {
            let layers = [{name: 'a', type: 'tilelayer', data: [1]}];
            let result = factory.mergeLayersByNameSubstring(layers, '');
            this.assertEqual(result, layers, 'same reference returned when matchKey is falsy');
        });
        await this.test('mergeLayersByNameSubstring collapses non-overlapping matching layers into one', async () => {
            let layers = [
                {name: 'tree-a', type: 'tilelayer', data: [1, 0, 0, 0]},
                {name: 'tree-b', type: 'tilelayer', data: [0, 2, 0, 0]}
            ];
            let result = factory.mergeLayersByNameSubstring(layers, 'tree');
            this.assertEqual(result.length, 1, 'two non-overlapping layers merge into a single layer');
            this.assertEqual(result[0].name, 'merge-tree', 'merged layer uses the merge-key name');
            this.assertEqual(result[0].type, 'tilelayer', 'merged layer keeps the template type');
            this.assertDeepEqual(result[0].data, [1, 2, 0, 0], 'merged data combines both layers');
        });
        await this.test('mergeLayersByNameSubstring spills overlapping matching layers into a second bucket', async () => {
            let layers = [
                {name: 'tree-a', type: 'tilelayer', data: [1, 0]},
                {name: 'tree-b', type: 'tilelayer', data: [2, 0]}
            ];
            let result = factory.mergeLayersByNameSubstring(layers, 'tree');
            this.assertEqual(result.length, 2, 'an overlapping tile forces a second bucket');
            this.assertEqual(result[0].name, 'merge-tree', 'first bucket keeps the base merge name');
            this.assertEqual(result[1].name, 'merge-tree-2', 'second bucket appends its index');
            this.assertEqual(result[0].data[0], 1, 'first bucket keeps the first layer tile');
            this.assertEqual(result[1].data[0], 2, 'second bucket keeps the second layer tile');
        });
        await this.test('mergeLayersByNameSubstring leaves non-matching layers in place', async () => {
            let layers = [
                {name: 'ground', type: 'tilelayer', data: [9, 0]},
                {name: 'tree-a', type: 'tilelayer', data: [1, 0]}
            ];
            let result = factory.mergeLayersByNameSubstring(layers, 'tree');
            this.assertEqual(result.length, 2, 'non-matching layer is retained alongside the merge');
            this.assertEqual(result[0].name, 'ground', 'non-matching ground passes through unchanged');
            this.assertEqual(result[1].name, 'merge-tree', 'matching layer is merged');
        });
    }

}

module.exports.TestLayerDataFactory = TestLayerDataFactory;
