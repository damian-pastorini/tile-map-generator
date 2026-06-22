/**
 *
 * Reldens - Test Geometry Calculator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');

class TestGeometryCalculator extends BaseMapGeneratorTest
{

    async testCalculateDistanceBetweenPositions()
    {
        let calculator = new GeometryCalculator();
        await this.test('calculateDistanceBetweenPositions returns euclidean distance', async () => {
            let distance = calculator.calculateDistanceBetweenPositions({x: 0, y: 0}, {x: 3, y: 4});
            this.assertEqual(distance, 5, 'distance for 3-4-5 triangle should be 5');
        });
        await this.test('calculateDistanceBetweenPositions returns zero for same point', async () => {
            let distance = calculator.calculateDistanceBetweenPositions({x: 2, y: 2}, {x: 2, y: 2});
            this.assertEqual(distance, 0, 'distance for identical points should be zero');
        });
    }

    async testGetNeighborPositions()
    {
        let calculator = new GeometryCalculator();
        await this.test('getNeighborPositions with corners returns eight neighbors in the middle', async () => {
            let neighbors = calculator.getNeighborPositions(2, 2, 5, 5, true);
            this.assertEqual(neighbors.length, 8, 'a central tile should have eight neighbors');
        });
        await this.test('getNeighborPositions without corners returns four neighbors', async () => {
            let neighbors = calculator.getNeighborPositions(2, 2, 5, 5, false);
            this.assertEqual(neighbors.length, 4, 'orthogonal neighbors should be four');
        });
        await this.test('getNeighborPositions clamps at the corner of the map', async () => {
            let neighbors = calculator.getNeighborPositions(0, 0, 5, 5, true);
            this.assertEqual(neighbors.length, 3, 'a corner tile should have three neighbors with corners');
        });
    }

    async testIsPositionWithinBounds()
    {
        let calculator = new GeometryCalculator();
        await this.test('isPositionWithinBounds detects inside and outside positions', async () => {
            this.assertEqual(calculator.isPositionWithinBounds(0, 0, 5, 5), true, 'origin is inside');
            this.assertEqual(calculator.isPositionWithinBounds(4, 4, 5, 5), true, 'last cell is inside');
            this.assertEqual(calculator.isPositionWithinBounds(5, 0, 5, 5), false, 'x out of range is outside');
            this.assertEqual(calculator.isPositionWithinBounds(-1, 0, 5, 5), false, 'negative x is outside');
        });
    }

    async testConnectedTilesAndCount()
    {
        let calculator = new GeometryCalculator();
        await this.test('connectedTiles reads the four neighbors around an index', async () => {
            let layer = [0, 1, 0, 1, 5, 1, 0, 1, 0];
            let connections = calculator.connectedTiles(4, layer, 3);
            this.assertEqual(connections.top, 1, 'top neighbor read');
            this.assertEqual(connections.down, 1, 'down neighbor read');
            this.assertEqual(connections.left, 1, 'left neighbor read');
            this.assertEqual(connections.right, 1, 'right neighbor read');
        });
        await this.test('countConnected totals the non-zero connections', async () => {
            let counted = calculator.countConnected({top: 1, down: 0, left: 3, right: 0});
            this.assertEqual(counted.total, 2, 'two non-zero connections');
            this.assertDeepEqual(counted.connections, [1, 0, 1, 0], 'connection flags reflect non-zero values');
        });
    }

    async testRandomCentralIndex()
    {
        let calculator = new GeometryCalculator();
        await this.test('randomCentralIndex returns the center without borders', async () => {
            let index = calculator.randomCentralIndex(5, 5, false);
            this.assertEqual(index, 12, 'center of a 5x5 grid is index 12');
        });
        await this.test('randomCentralIndex returns the floored center with borders applied', async () => {
            let index = calculator.randomCentralIndex(5, 5, true);
            this.assertEqual(index, 12, 'center within borders of a 5x5 grid is index 12');
        });
    }

    async testGet4Neighbors()
    {
        let calculator = new GeometryCalculator();
        await this.test('get4Neighbors returns four neighbors for a central index', async () => {
            let neighbors = calculator.get4Neighbors(12, 5, 5, false);
            this.assertEqual(neighbors.length, 4, 'central index has four neighbors');
        });
        await this.test('get4Neighbors omits out-of-range neighbors at the origin', async () => {
            let neighbors = calculator.get4Neighbors(0, 5, 5, false);
            this.assertEqual(neighbors.length, 2, 'origin has only down and right neighbors');
        });
    }

    async testRectsOverlap()
    {
        let calculator = new GeometryCalculator();
        await this.test('rectsOverlap detects overlapping rectangles', async () => {
            let overlap = calculator.rectsOverlap({x: 0, y: 0, width: 2, height: 2}, {x: 1, y: 1, width: 2, height: 2});
            this.assertEqual(overlap, true, 'rectangles sharing area overlap');
        });
        await this.test('rectsOverlap detects separated rectangles', async () => {
            let overlap = calculator.rectsOverlap({x: 0, y: 0, width: 2, height: 2}, {x: 5, y: 5, width: 2, height: 2});
            this.assertEqual(overlap, false, 'distant rectangles do not overlap');
        });
    }

    async testPlacementOffsets()
    {
        let calculator = new GeometryCalculator();
        await this.test('placementOffsets returns the eight surrounding offsets', async () => {
            let offsets = calculator.placementOffsets();
            this.assertEqual(offsets.length, 8, 'there should be eight placement offsets');
            this.assertDeepEqual(offsets[0], {x: 1, y: 0}, 'first offset is to the right');
        });
    }

    async testIsFootprintWalkable()
    {
        let calculator = new GeometryCalculator();
        await this.test('isFootprintWalkable returns true when all cells are walkable', async () => {
            let grid = [
                [true, true, true],
                [true, true, true],
                [true, true, true]
            ];
            this.assertEqual(calculator.isFootprintWalkable(grid, 0, 0, 2, 2), true, 'full walkable footprint passes');
        });
        await this.test('isFootprintWalkable returns false when a cell is blocked', async () => {
            let grid = [
                [true, true, true],
                [true, false, true],
                [true, true, true]
            ];
            this.assertEqual(calculator.isFootprintWalkable(grid, 0, 0, 2, 2), false, 'blocked cell fails footprint');
        });
    }

    async testFindNearestPosition()
    {
        let calculator = new GeometryCalculator();
        await this.test('findNearestPosition returns the closest candidate', async () => {
            let positions = [{x: 10, y: 10}, {x: 1, y: 1}, {x: 5, y: 5}];
            let nearest = calculator.findNearestPosition({x: 0, y: 0}, positions);
            this.assertDeepEqual(nearest, {x: 1, y: 1}, 'closest position selected');
        });
        await this.test('findNearestPosition returns null for empty positions', async () => {
            let nearest = calculator.findNearestPosition({x: 0, y: 0}, []);
            this.assertEqual(nearest, null, 'empty list yields null');
        });
    }

}

module.exports.TestGeometryCalculator = TestGeometryCalculator;
