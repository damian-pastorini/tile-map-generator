/**
 *
 * Reldens - Test Path Finder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PathFinder } = require('../lib/path-finder/path-finder');

class TestPathFinder extends BaseMapGeneratorTest
{

    async testCreateReturnsGridWithDimensions()
    {
        let pathFinder = new PathFinder();
        await this.test('create returns a grid with the given dimensions', async () => {
            let grid = pathFinder.create(5, 4);
            this.assertEqual(grid.width, 5, 'Grid width should match');
            this.assertEqual(grid.height, 4, 'Grid height should match');
        });
    }

    async testFindPathReturnsArray()
    {
        let pathFinder = new PathFinder();
        await this.test('findPath returns an array of coordinate steps', async () => {
            let grid = pathFinder.create(5, 5);
            let path = pathFinder.findPath({x: 0, y: 0}, {x: 4, y: 4}, grid);
            this.assert(Array.isArray(path), 'Path should be an array');
            this.assert(0 < path.length, 'Open grid should produce a non empty path');
        });
    }

    async testFindPathStartsAndEndsAtRequestedPoints()
    {
        let pathFinder = new PathFinder();
        await this.test('findPath starts at start and ends at end coordinates', async () => {
            let grid = pathFinder.create(5, 5);
            let path = pathFinder.findPath({x: 0, y: 0}, {x: 4, y: 0}, grid);
            let first = path[0];
            let last = path[path.length - 1];
            this.assertEqual(first[0], 0, 'Path should start at start x');
            this.assertEqual(first[1], 0, 'Path should start at start y');
            this.assertEqual(last[0], 4, 'Path should end at end x');
            this.assertEqual(last[1], 0, 'Path should end at end y');
        });
    }

    async testFindPathDoesNotMutateGrid()
    {
        let pathFinder = new PathFinder();
        await this.test('findPath clones the grid and leaves walkability intact', async () => {
            let grid = pathFinder.create(4, 4);
            let before = grid.isWalkableAt(2, 2);
            pathFinder.findPath({x: 0, y: 0}, {x: 3, y: 3}, grid);
            this.assertEqual(grid.isWalkableAt(2, 2), before, 'Original grid walkability should be unchanged');
        });
    }

    async testFindPathReturnsEmptyWhenBlocked()
    {
        let pathFinder = new PathFinder();
        await this.test('findPath returns an empty array when no path exists', async () => {
            let grid = pathFinder.create(3, 3);
            grid.setWalkableAt(1, 0, false);
            grid.setWalkableAt(1, 1, false);
            grid.setWalkableAt(1, 2, false);
            let path = pathFinder.findPath({x: 0, y: 0}, {x: 2, y: 2}, grid);
            this.assertEqual(path.length, 0, 'Blocked grid should yield an empty path');
        });
    }

}

module.exports.TestPathFinder = TestPathFinder;
