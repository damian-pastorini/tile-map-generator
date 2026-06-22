/**
 *
 * Reldens - Test Tile Position Calculator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { TilePositionCalculator } = require('../lib/generator/tile-position-calculator');

class TestTilePositionCalculator extends BaseMapGeneratorTest
{

    async testTileIndexByRowAndColumn()
    {
        await this.test('tileIndexByRowAndColumn computes row major index', async () => {
            let calculator = new TilePositionCalculator({mapWidth: 10, mapHeight: 8});
            this.assertEqual(calculator.tileIndexByRowAndColumn(0, 0), 0, 'Origin index');
            this.assertEqual(calculator.tileIndexByRowAndColumn(2, 3), 23, 'Row 2 column 3 index');
        });
    }

    async testFetchNonBorderValue()
    {
        await this.test('fetchNonBorderValue clamps border values inward', async () => {
            let calculator = new TilePositionCalculator({mapWidth: 10, mapHeight: 8});
            this.assertEqual(calculator.fetchNonBorderValue(0, 10), 1, 'Zero becomes one');
            this.assertEqual(calculator.fetchNonBorderValue(9, 10), 8, 'Max becomes dimension minus two');
            this.assertEqual(calculator.fetchNonBorderValue(5, 10), 5, 'Inner value unchanged');
        });
    }

    async testProvideReturnIndexByPosition()
    {
        await this.test('provideReturnIndexByPosition uses clamped values', async () => {
            let calculator = new TilePositionCalculator({mapWidth: 10, mapHeight: 8});
            let index = calculator.provideReturnIndexByPosition(0, 5);
            this.assertEqual(index, 51, 'Clamped x 1 row 5 gives index 51');
        });
    }

    async testProvideReturnIndexWithElementData()
    {
        await this.test('provideReturnIndexByPosition offsets by element position', async () => {
            let calculator = new TilePositionCalculator({mapWidth: 10, mapHeight: 8});
            let index = calculator.provideReturnIndexByPosition(2, 3, {position: {x: 4, y: 1}});
            this.assertEqual(index, 46, 'Element offset row 4 column 6 gives index 46');
        });
    }

    async testIsBorder()
    {
        await this.test('isBorder detects edge positions', async () => {
            let calculator = new TilePositionCalculator({mapWidth: 10, mapHeight: 8});
            this.assert(calculator.isBorder({x: 0, y: 4}), 'Left edge is border');
            this.assert(calculator.isBorder({x: 4, y: 0}), 'Top edge is border');
            this.assert(calculator.isBorder({x: 10, y: 4}), 'Right width edge is border');
            this.assert(calculator.isBorder({x: 4, y: 8}), 'Bottom height edge is border');
            this.assert(!calculator.isBorder({x: 4, y: 4}), 'Inner position is not border');
        });
    }

}

module.exports.TestTilePositionCalculator = TestTilePositionCalculator;
