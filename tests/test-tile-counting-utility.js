/**
 *
 * Reldens - Test Tile Counting Utility
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { TileCountingUtility } = require('../lib/map/tile-counting-utility');

class TestTileCountingUtility extends BaseMapGeneratorTest
{

    async testCountTilesInLayer()
    {
        await this.test('countTilesInLayer counts an exact tile value', async () => {
            this.assertEqual(TileCountingUtility.countTilesInLayer([1, 2, 1, 1, 3], 1), 3, 'three matching tiles');
        });
        await this.test('countTilesInLayer counts using a predicate', async () => {
            let count = TileCountingUtility.countTilesInLayer([1, 2, 3, 4], tile => tile > 2);
            this.assertEqual(count, 2, 'two tiles greater than two');
        });
        await this.test('countTilesInLayer returns zero for non-array input', async () => {
            this.assertEqual(TileCountingUtility.countTilesInLayer(null, 1), 0, 'null input yields zero');
        });
    }

    async testCountNonZeroAndZero()
    {
        await this.test('countNonZeroTiles counts every non-zero tile', async () => {
            this.assertEqual(TileCountingUtility.countNonZeroTiles([0, 5, 0, 7, 9]), 3, 'three non-zero tiles');
        });
        await this.test('countZeroTiles counts every zero tile', async () => {
            this.assertEqual(TileCountingUtility.countZeroTiles([0, 5, 0, 7, 9]), 2, 'two zero tiles');
        });
    }

    async testCountTilesFromSet()
    {
        await this.test('countTilesFromSet counts tiles present in the set', async () => {
            this.assertEqual(TileCountingUtility.countTilesFromSet([1, 2, 3, 4, 5], [2, 4]), 2, 'two tiles in set');
        });
        await this.test('countTilesFromSet returns zero for invalid inputs', async () => {
            this.assertEqual(TileCountingUtility.countTilesFromSet(null, [2]), 0, 'invalid layer yields zero');
            this.assertEqual(TileCountingUtility.countTilesFromSet([1, 2], null), 0, 'invalid set yields zero');
        });
    }

    async testCountAvailableGroundTiles()
    {
        await this.test('countAvailableGroundTiles counts the empty path cells', async () => {
            this.assertEqual(TileCountingUtility.countAvailableGroundTiles([0, 121, 0, 0, 121], 116), 3, 'three empty cells');
        });
        await this.test('countAvailableGroundTiles returns zero for non-array path data', async () => {
            this.assertEqual(TileCountingUtility.countAvailableGroundTiles(null, 116), 0, 'invalid input yields zero');
        });
    }

    async testCountVariationTiles()
    {
        await this.test('countVariationTiles counts variation ground tiles present', async () => {
            let count = TileCountingUtility.countVariationTiles([26, 0, 27, 116, 26], [26, 27, 28]);
            this.assertEqual(count, 3, 'three variation tiles counted');
        });
        await this.test('countVariationTiles returns zero when no variations match', async () => {
            let count = TileCountingUtility.countVariationTiles([116, 0, 121], [26, 27, 28]);
            this.assertEqual(count, 0, 'no variation tiles counted');
        });
    }

    async testCountSpotsInMap()
    {
        await this.test('countSpotsInMap counts layers matching the key that hold tiles', async () => {
            let map = {
                layers: [
                    {name: 'spot-safe-1', data: [0, 5, 0]},
                    {name: 'spot-safe-2', data: [0, 0, 0]},
                    {name: 'spot-safe-3', data: [7]},
                    {name: 'ground', data: [1, 1, 1]}
                ]
            };
            this.assertEqual(TileCountingUtility.countSpotsInMap(map, 'spot-safe'), 2, 'two non-empty spot layers');
        });
        await this.test('countSpotsInMap returns zero when no layers match', async () => {
            let map = {layers: [{name: 'ground', data: [1, 2, 3]}]};
            this.assertEqual(TileCountingUtility.countSpotsInMap(map, 'spot'), 0, 'no matching spot layers');
        });
    }

}

module.exports.TestTileCountingUtility = TestTileCountingUtility;
