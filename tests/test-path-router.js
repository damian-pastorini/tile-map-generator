/**
 *
 * Reldens - Test Path Router
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PathRouter } = require('../lib/generator/path-router');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');

class TestPathRouter extends BaseMapGeneratorTest
{

    async testFetchEndReturnsMainPathStartWhenProvided()
    {
        await this.test('fetchEndPathTilePosition returns mainPathStart when set', async () => {
            let router = new PathRouter({findPath: () => []}, new GeometryCalculator());
            let mainPathStart = {x: 5, y: 6};
            let result = router.fetchEndPathTilePosition([{x: 1, y: 1}], {x: 2, y: 2}, mainPathStart);
            this.assertEqual(result, mainPathStart, 'Should return mainPathStart');
        });
    }

    async testFetchEndReturnsFirstPositionWhenArray()
    {
        await this.test('fetchEndPathTilePosition returns first position from array', async () => {
            let router = new PathRouter({findPath: () => []}, new GeometryCalculator());
            let positions = [{x: 1, y: 1}, {x: 2, y: 2}];
            let result = router.fetchEndPathTilePosition(positions, {x: 9, y: 9}, null);
            this.assertEqual(result, positions[0], 'Should return first array element');
        });
    }

    async testFetchEndFallsBackToPathTilePosition()
    {
        await this.test('fetchEndPathTilePosition falls back to pathTilePosition', async () => {
            let router = new PathRouter({findPath: () => []}, new GeometryCalculator());
            let fallback = {x: 3, y: 4};
            let result = router.fetchEndPathTilePosition(null, fallback, null);
            this.assertEqual(result, fallback, 'Should return the fallback position');
        });
    }

    async testSortPositionsDisabledReturnsSameArray()
    {
        await this.test('sortPositionsByDistanceFromCenter returns input when flag is false', async () => {
            let router = new PathRouter({findPath: () => []}, new GeometryCalculator());
            let positions = [{x: 0, y: 0}, {x: 9, y: 9}];
            let result = router.sortPositionsByDistanceFromCenter(positions, 10, 10, false);
            this.assertEqual(result, positions, 'Should return the same array reference');
        });
    }

    async testSortPositionsByDistanceFromCenter()
    {
        await this.test('sortPositionsByDistanceFromCenter orders nearest to center first', async () => {
            let router = new PathRouter({findPath: () => []}, new GeometryCalculator());
            let near = {x: 5, y: 5};
            let far = {x: 0, y: 0};
            let result = router.sortPositionsByDistanceFromCenter([far, near], 10, 10, true);
            this.assertEqual(result[0], near, 'Nearest to center should be first');
            this.assertEqual(result[1], far, 'Farthest should be last');
        });
    }

    async testFindPathTilePositions()
    {
        await this.test('findPathTilePositions locates matching tile coordinates', async () => {
            let router = new PathRouter({findPath: () => []}, new GeometryCalculator());
            let layerData = [0, 0, 0, 0, 5, 0, 0, 0, 0];
            let result = router.findPathTilePositions(layerData, 3, 3, 5);
            this.assertEqual(result.length, 1, 'Should find one matching tile');
            this.assertEqual(result[0].x, 1, 'Column should be 1');
            this.assertEqual(result[0].y, 1, 'Row should be 1');
            this.assertEqual(result[0].index, 4, 'Index should be 4');
        });
    }

    async testFindPathToPointsDirectMatch()
    {
        await this.test('findPathToPoints returns the direct path when found', async () => {
            let grid = {isWalkableAt: () => true};
            let pathFinder = {findPath: () => [[0, 0], [1, 1]]};
            let router = new PathRouter(pathFinder, new GeometryCalculator());
            let result = router.findPathToPoints({x: 0, y: 0}, {x: 2, y: 2}, [{x: 0, y: 0}], grid);
            this.assertEqual(result.length, 2, 'Direct path of length two returned');
            this.assertEqual(result[1][0], 1, 'Second step x preserved');
        });
    }

    async testFindPathToPointsRetriesOverPositions()
    {
        await this.test('findPathToPoints retries other positions until a path is found', async () => {
            let grid = {isWalkableAt: () => true};
            let pathFinder = {findPath: (start, end) => end && 3 === end.x ? [[3, 3]] : []};
            let router = new PathRouter(pathFinder, new GeometryCalculator());
            let result = router.findPathToPoints(
                {x: 0, y: 0},
                {x: 2, y: 2},
                [{x: 0, y: 0}, {x: 3, y: 3}],
                grid
            );
            this.assertEqual(result.length, 1, 'Retry found a path of length one');
            this.assertEqual(result[0][0], 3, 'Path corresponds to the retried position');
        });
    }

    async testFindPathToPointsReturnsEmptyWhenUnreachable()
    {
        await this.test('findPathToPoints returns empty path when nothing connects', async () => {
            let grid = {isWalkableAt: () => false};
            let pathFinder = {findPath: () => []};
            let router = new PathRouter(pathFinder, new GeometryCalculator());
            let result = router.findPathToPoints({x: 1, y: 1}, {x: 2, y: 2}, [{x: 1, y: 1}], grid);
            this.assertEqual(result.length, 0, 'No path found yields empty array');
        });
    }

}

module.exports.TestPathRouter = TestPathRouter;
