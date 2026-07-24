/**
 *
 * Reldens - Test Map Grid Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapGridBuilder } = require('../lib/generator/map-grid-builder');
const { TilePositionCalculator } = require('../lib/generator/tile-position-calculator');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { MapLayersComposer } = require('../lib/generator/map-layers-composer');
const { PathFinder } = require('../lib/path-finder/path-finder');

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
            mapSizeFreeSpaceSidesMultiplier: 1,
            minimumDistanceFromBorders: 0,
            blockMapBorder: false
        };
        generator.tilePositionCalculator = new TilePositionCalculator(generator);
        return overrides ? Object.assign(generator, overrides) : generator;
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

    async testSetMapSizeReturnsProvidedDimensions()
    {
        await this.test('setMapSize returns provided positive dimensions', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub());
            let result = builder.setMapSize({mapWidth: 7, mapHeight: 9});
            this.assertEqual(result.mapWidth, 7);
            this.assertEqual(result.mapHeight, 9);
        });
    }

    async testCalculateMapSizeWithFreeSpace()
    {
        await this.test('calculateMapSizeWithFreeSpace computes size from element area', async () => {
            let generator = this.buildGeneratorStub({
                layerElements: {tree: [{type: 'tilelayer', width: 2, height: 2}]},
                elementsQuantity: {tree: 1},
                elementsPlacer: {determineElementFreeSpaceAround: () => 0},
                groundSpots: {}
            });
            generator.mapLayersComposer = new MapLayersComposer(generator);
            let builder = new MapGridBuilder(generator);
            let result = builder.calculateMapSizeWithFreeSpace();
            this.assertEqual(result.mapWidth, 2);
            this.assertEqual(result.mapHeight, 2);
        });
    }

    async testCalculateMapSizeWithFreeSpaceNoElementsReturnsFalse()
    {
        await this.test('calculateMapSizeWithFreeSpace returns false without layer elements', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub({layerElements: null}));
            this.assertEqual(builder.calculateMapSizeWithFreeSpace(), false);
        });
    }

    async testCalculateMapSizeWithFreeSpaceNoQuantityReturnsFalse()
    {
        await this.test('calculateMapSizeWithFreeSpace returns false without elements quantity', async () => {
            let builder = new MapGridBuilder(this.buildGeneratorStub({layerElements: {tree: []}, elementsQuantity: {}}));
            this.assertEqual(builder.calculateMapSizeWithFreeSpace(), false);
        });
    }

    async testCreatePathfindingGrid()
    {
        await this.test('createPathfindingGrid blocks collision tiles and mapGrid-false cells', async () => {
            let generator = this.buildGeneratorStub({mapWidth: 3, mapHeight: 3, layerDataFactory: new LayerDataFactory()});
            let builder = new MapGridBuilder(generator);
            let mapGrid = Array.from({length: 3}, () => Array(3).fill(true));
            mapGrid[2][2] = false;
            let additionalLayers = [{name: 'tree-collisions', data: [0, 0, 0, 0, 7, 0, 0, 0, 0]}];
            let result = builder.createPathfindingGrid(
                new PathFinder(),
                3,
                3,
                [],
                additionalLayers,
                ['collisions'],
                mapGrid
            );
            this.assertEqual(result.grid.isWalkableAt(1, 1), false);
            this.assertEqual(result.grid.isWalkableAt(0, 0), true);
            this.assertEqual(result.grid.isWalkableAt(2, 2), false);
            this.assertEqual(result.debugLayerData[4], 2);
            this.assertEqual(result.debugLayerData[8], 2);
            this.assertEqual(result.debugLayerData[0], 0);
        });
    }

}

module.exports.TestMapGridBuilder = TestMapGridBuilder;
