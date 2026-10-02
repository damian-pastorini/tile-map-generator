/**
 *
 * Reldens - Test Main Path Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MainPathGeneratorBuilder } = require('./main-path-generator-builder');
const { MainPathGenerator } = require('../lib/generator/main-path-generator');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { MainPathEdgesConstants } = require('../lib/constants');

class TestMainPathGenerator extends BaseMapGeneratorTest
{

    buildWalkableGrid(size)
    {
        let grid = [];
        for(let row = 0; row < size; row++){
            grid.push(new Array(size).fill(true));
        }
        return grid;
    }

    placeMainPathOnFiveByFive(recordDefaultReturnPoint)
    {
        return MainPathGeneratorBuilder.build(5, 5).placeMainPath(
            new Array(25).fill(0),
            this.buildWalkableGrid(5),
            5,
            5,
            [{index: 2, x: 2, y: 0}, {index: 3, x: 3, y: 0}],
            [],
            {},
            [],
            false,
            null,
            [],
            {},
            2,
            false,
            true,
            'town',
            9,
            recordDefaultReturnPoint
        );
    }

    async testGenerateFullMainPathWithIndexes()
    {
        await this.test('generateFullMainPathWithIndexes builds horizontal run on top edge', async () => {
            let generator = MainPathGeneratorBuilder.build(5, 5);
            let result = generator.generateFullMainPathWithIndexes(0, 0, 2, 0, 5, 5, 3);
            this.assertEqual(result.mainPathStart.x, 2, 'Start x set from random start x');
            this.assertEqual(result.mainPathStart.y, 0, 'Start y on top walkable row');
            this.assertEqual(result.generatedPathIndexes.length, 3, 'Three path tiles generated');
            this.assertEqual(result.generatedPathIndexes[0].index, 2, 'First index');
            this.assertEqual(result.generatedPathIndexes[1].index, 3, 'Second index');
            this.assertEqual(result.generatedPathIndexes[2].index, 4, 'Third index');
        });
    }

    async testGenerateFullMainPathWithIndexesKeepsSideEdgesVertical()
    {
        await this.test('generateFullMainPathWithIndexes keeps a right edge path vertical on the first row', async () => {
            let generator = MainPathGeneratorBuilder.build(8, 8);
            let result = generator.generateFullMainPathWithIndexes(1, MainPathEdgesConstants.RIGHT, 2, 1, 8, 8, 3);
            this.assertDeepEqual(
                result.generatedPathIndexes,
                [{index: 14, x: 6, y: 1}, {index: 22, x: 6, y: 2}, {index: 30, x: 6, y: 3}],
                'A right edge path starting on the first walkable row must run down the column, not off the map'
            );
        });
    }

    async testDetermineReturnPointFromMainPath()
    {
        await this.test('determineReturnPointFromMainPath clamps to non border with blockMapBorder', async () => {
            let generator = MainPathGeneratorBuilder.build(5, 5);
            let indexes = [{x: 2, y: 0, index: 2}, {x: 3, y: 0, index: 3}, {x: 4, y: 0, index: 4}];
            let result = generator.determineReturnPointFromMainPath(indexes, 5, 5, true);
            this.assertEqual(result.returnPointX, 3, 'Return x from second index');
            this.assertEqual(result.returnPointY, 1, 'Return y moved one row inside the top edge');
            this.assertEqual(result.position, 'down', 'Default position is down');
        });
    }

    async testPlaceAllMainPathIndexes()
    {
        await this.test('placeAllMainPathIndexes writes path tiles and reports success', async () => {
            let marked = [];
            let generator = MainPathGeneratorBuilder.build(5, 5, marked);
            let pathLayerData = new Array(25).fill(0);
            let mapGrid = this.buildWalkableGrid(5);
            let indexes = [{index: 2, x: 2, y: 0}, {index: 3, x: 3, y: 0}];
            let failed = generator.placeAllMainPathIndexes(indexes, pathLayerData, mapGrid, 9);
            this.assertEqual(failed, false, 'Placement did not fail');
            this.assertEqual(pathLayerData[2], 9, 'First path tile written');
            this.assertEqual(pathLayerData[3], 9, 'Second path tile written');
            this.assertEqual(marked.length, 2, 'Grid positions marked for each tile');
        });
    }

    async testMarkPathTilesAsUnavailable()
    {
        await this.test('markPathTilesAsUnavailable blocks grid cells with path tiles', async () => {
            let generator = MainPathGeneratorBuilder.build(3, 3);
            let pathLayerData = new Array(9).fill(0);
            pathLayerData[4] = 7;
            let mapGrid = this.buildWalkableGrid(3);
            generator.markPathTilesAsUnavailable(false, pathLayerData, mapGrid, 3, 3, false);
            this.assertEqual(mapGrid[1][1], false, 'Cell with path tile is blocked');
            this.assertEqual(mapGrid[0][0], true, 'Empty cell stays walkable');
        });
    }

    async testGenerateRandomMainPathZeroSize()
    {
        await this.test('generateRandomMainPath returns empty data for zero size', async () => {
            let generator = MainPathGeneratorBuilder.build(8, 8);
            let result = generator.generateRandomMainPath(8, 8, 0, true);
            this.assertEqual(result.mainPathStart, null, 'No start for zero size');
            this.assertEqual(result.generatedMainPathIndexes.length, 0, 'No indexes for zero size');
            this.assertEqual(result.generatedMainPathIndexesBorder.length, 0, 'No border indexes for zero size');
            this.assertEqual(result.edge, false, 'No edge for zero size');
        });
    }

    async testGenerateRandomMainPathBorderWalkable()
    {
        Math.random = this.seedRandom(4321);
        try {
            await this.test('generateRandomMainPath builds walkable border path of requested size', async () => {
                let generator = MainPathGeneratorBuilder.build(8, 8);
                let result = generator.generateRandomMainPath(8, 8, 3, true);
                this.assertEqual(result.generatedMainPathIndexes.length, 3, 'Three path tiles generated');
                this.assertEqual(result.mainPathStartBorder, null, 'No separate border start when walkable');
                this.assertEqual(result.generatedMainPathIndexesBorder.length, 0, 'No border indexes when walkable');
                this.assert(result.mainPathStart, 'Main path start defined');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testGenerateRandomMainPathNotBorderWalkable()
    {
        Math.random = this.seedRandom(987);
        try {
            await this.test('generateRandomMainPath builds inner and border indexes when border blocked', async () => {
                let generator = MainPathGeneratorBuilder.build(8, 8);
                let result = generator.generateRandomMainPath(8, 8, 3, false);
                this.assertEqual(result.generatedMainPathIndexes.length, 3, 'Three inner path tiles generated');
                this.assertEqual(result.generatedMainPathIndexesBorder.length, 3, 'Three border path tiles generated');
                this.assert(result.mainPathStartBorder, 'Border start defined when not walkable');
            });
        } finally {
            this.restoreMathRandom();
        }
    }

    async testPlaceMainPathIndexSuccess()
    {
        await this.test('placeMainPathIndex writes tile and marks grid returning true', async () => {
            let marked = [];
            let generator = MainPathGeneratorBuilder.build(3, 3, marked);
            let pathLayerData = new Array(9).fill(0);
            let mapGrid = this.buildWalkableGrid(3);
            let placed = generator.placeMainPathIndex(4, 1, 1, pathLayerData, mapGrid, 9);
            this.assertEqual(placed, true, 'Successful placement returns true');
            this.assertEqual(pathLayerData[4], 9, 'Path tile written at index');
            this.assertEqual(marked.length, 1, 'Grid position marked once');
        });
    }

    async testPlaceMainPathIndexFailure()
    {
        await this.test('placeMainPathIndex returns false when grid marking throws', async () => {
            let generator = new MainPathGenerator(null, new ReturnPointWriter(), new LayerDataFactory(), {});
            let pathLayerData = new Array(9).fill(0);
            let mapGrid = this.buildWalkableGrid(3);
            let placed = generator.placeMainPathIndex(4, 1, 1, pathLayerData, mapGrid, 9);
            this.assertEqual(placed, false, 'Failed placement returns false');
        });
    }

    async testPlaceMainPathRecordsReturnPoint()
    {
        await this.test('placeMainPath places provided indexes and records default return point', async () => {
            let result = this.placeMainPathOnFiveByFive(true);
            this.assertEqual(result.pathLayerData[2], 9, 'First main path tile placed');
            this.assertEqual(result.pathLayerData[3], 9, 'Second main path tile placed');
            this.assert(result.generatedReturnPoints['default-main-path'], 'Default return point recorded');
            this.assertEqual(result.generatedReturnPoints['default-main-path'].mapIndex, 8, 'Return index resolved');
            this.assertEqual(result.generatedReturnPoints['default-main-path'].x, 3, 'Return point x recorded');
            this.assertEqual(result.generatedReturnPoints['default-main-path'].y, 1, 'Return point y recorded');
            this.assertEqual(result.pathLayerProperties.length, 4, 'Four return point properties pushed');
            this.assertEqual(result.mainPathEdge, MainPathEdgesConstants.TOP, 'The main path runs along the top edge');
        });
    }

    async testPlaceMainPathSkipsDefaultReturnPointForLinkedMaps()
    {
        await this.test('placeMainPath does not record the default return point for linked maps', async () => {
            let result = this.placeMainPathOnFiveByFive(false);
            this.assertEqual(result.pathLayerData[2], 9, 'The main path is still placed');
            this.assertDeepEqual(result.generatedReturnPoints, {}, 'No default return point recorded');
            this.assertDeepEqual(result.pathLayerProperties, [], 'No default return point properties pushed');
        });
    }

    async testPlaceMainPathMirrorsThePreviousMapPathWithItsBorderCells()
    {
        await this.test('placeMainPath mirrors an inner row previous path and paints its border opening', async () => {
            let result = MainPathGeneratorBuilder.build(10, 10).placeMainPath(
                new Array(100).fill(0),
                this.buildWalkableGrid(10),
                10,
                10,
                [],
                [],
                {},
                [],
                false,
                null,
                [{index: 13, x: 3, y: 1}, {index: 14, x: 4, y: 1}, {index: 15, x: 5, y: 1}],
                {mapWidth: 10, mapHeight: 10},
                3,
                false,
                true,
                'level-2',
                9,
                false
            );
            this.assertDeepEqual(
                result.generatedMainPathIndexes,
                [{index: 83, x: 3, y: 8}, {index: 84, x: 4, y: 8}, {index: 85, x: 5, y: 8}],
                'A top inner row path must be mirrored onto the bottom inner row'
            );
            this.assertDeepEqual(
                result.generatedMainPathIndexesBorder,
                [{index: 93, x: 3, y: 9}, {index: 94, x: 4, y: 9}, {index: 95, x: 5, y: 9}],
                'The mirrored path border cells must be on the bottom border row'
            );
            let paintedTiles = [83, 84, 85, 93, 94, 95].map(index => result.pathLayerData[index]);
            this.assertDeepEqual(paintedTiles, [9, 9, 9, 9, 9, 9], 'Inner and border cells are painted');
            this.assert(result.hasAssociatedMap, 'A mirrored path marks the map as associated');
            this.assertDeepEqual(result.mainPathStart, {x: 4, y: 8}, 'The start is the mirrored middle tile');
            this.assertEqual(result.mainPathEdge, MainPathEdgesConstants.BOTTOM, 'The mirrored path edge is bottom');
        });
    }

}

module.exports.TestMainPathGenerator = TestMainPathGenerator;
