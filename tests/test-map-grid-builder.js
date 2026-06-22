/**
 *
 * Reldens - Test Map Grid Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapGridBuilder } = require('../lib/generator/map-grid-builder');
const { TilePositionCalculator } = require('../lib/generator/tile-position-calculator');

class TestMapGridBuilder extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            mapWidth: 4,
            mapHeight: 3,
            mapLayersComposer: {},
            elementsPlacer: {},
            tilePositionCalculator: null,
            layerElements: {},
            elementsQuantity: {},
            freeSpaceTilesQuantity: 0,
            freeSpaceMultiplier: 1,
            freeTilesMultiplier: 1,
            minimumDistanceFromBorders: 0,
            blockMapBorder: false
        };
        generator.tilePositionCalculator = new TilePositionCalculator(generator);
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            this.assert(builder instanceof MapGridBuilder, 'Expected MapGridBuilder instance');
            this.assert('function' === typeof builder.generateEmptyMap, 'Expected generateEmptyMap method');
            this.assert('function' === typeof builder.markMapGridPosition, 'Expected markMapGridPosition method');
            this.assert('function' === typeof builder.markBorderAsNotWalkable, 'Expected markBorderAsNotWalkable method');
        });
    }

    async testGenerateEmptyMapWithFixedSize()
    {
        await this.test('generateEmptyMap builds grid and ground data', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            let result = builder.generateEmptyMap({mapWidth: 3, mapHeight: 2}, 5);
            this.assertEqual(result.mapWidth, 3);
            this.assertEqual(result.mapHeight, 2);
            this.assertEqual(result.mapGrid.length, 2);
            this.assertEqual(result.mapGrid[0].length, 3);
            this.assertEqual(result.mapGrid[0][0], true);
            this.assertEqual(result.groundLayerData.length, 6);
            this.assertEqual(result.groundLayerData[0], 5);
        });
    }

    async testGenerateEmptyMapZeroGroundTile()
    {
        await this.test('generateEmptyMap with zero ground tile yields null ground data', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            let result = builder.generateEmptyMap({mapWidth: 2, mapHeight: 2}, 0);
            this.assertEqual(result.groundLayerData, null);
        });
    }

    async testMarkMapGridPosition()
    {
        await this.test('markMapGridPosition updates valid cell and ignores out of bounds', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            let mapGrid = [[true, true], [true, true]];
            builder.markMapGridPosition(mapGrid, 1, 0, false);
            this.assertEqual(mapGrid[1][0], false);
            builder.markMapGridPosition(mapGrid, 5, 5, false);
            this.assertEqual(mapGrid[0][0], true);
            this.assertEqual(mapGrid[0][1], true);
        });
    }

    async testMarkBorderAsNotWalkable()
    {
        await this.test('markBorderAsNotWalkable blocks every border cell', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            let mapWidth = 4;
            let mapHeight = 3;
            let mapGrid = Array.from({length: mapHeight}, () => Array(mapWidth).fill(true));
            builder.markBorderAsNotWalkable(mapGrid, mapWidth, mapHeight);
            this.assertEqual(mapGrid[0][0], false);
            this.assertEqual(mapGrid[0][3], false);
            this.assertEqual(mapGrid[2][0], false);
            this.assertEqual(mapGrid[2][3], false);
            this.assertEqual(mapGrid[1][1], true);
        });
    }

    async testIsOccupiedByAnotherCollision()
    {
        await this.test('isOccupiedByAnotherCollision detects non-zero tiles', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            let layers = [{data: [0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0]}];
            this.assertEqual(builder.isOccupiedByAnotherCollision(0, 1, layers, null), true);
            this.assertEqual(builder.isOccupiedByAnotherCollision(1, 1, layers, null), false);
        });
    }

    async testUnblockTemporalBlockedPoints()
    {
        await this.test('unblockTemporalBlockedPoints re-opens allowed positions only', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            let mapGrid = Array.from({length: 5}, () => Array(5).fill(false));
            let points = [
                {previousTileY: 1, previousTileX: 1, nextTileY: 3, nextTileX: 3, allowPathsInFreeSpace: true},
                {previousTileY: 0, previousTileX: 0, nextTileY: 4, nextTileX: 4, allowPathsInFreeSpace: false}
            ];
            builder.unblockTemporalBlockedPoints(points, mapGrid);
            this.assertEqual(mapGrid[1][1], true);
            this.assertEqual(mapGrid[3][3], true);
            this.assertEqual(mapGrid[0][0], false);
            this.assertEqual(mapGrid[4][4], false);
        });
    }

}

module.exports.TestMapGridBuilder = TestMapGridBuilder;
