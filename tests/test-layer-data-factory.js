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

}

module.exports.TestLayerDataFactory = TestLayerDataFactory;
