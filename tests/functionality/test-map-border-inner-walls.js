/**
 *
 * Reldens - Test Map Border Inner Walls
 *
 * Real map cases for the map border inner walls. Every case generates a complete map from the committed real
 * house-composite.json, whose tileset carries the nine wall- key annotations, so the layer, the two wall rows
 * below the top border and the skipped corner columns are all proven on a real generated map instead of a stub.
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { MapTileKeyFinder } = require('../map-tile-key-finder');
const { LayerUtility } = require('../../lib/map/layer-utility');
const { TileCountingUtility } = require('../../lib/map/tile-counting-utility');

class TestMapBorderInnerWalls extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.wallsLayerName = 'map-border-inner-walls-collisions';
    }

    collectRowTiles(layerData, mapWidth, rowIndex)
    {
        let rowTiles = [];
        for(let columnIndex = 0; columnIndex < mapWidth; columnIndex++){
            rowTiles.push(layerData[rowIndex * mapWidth + columnIndex]);
        }
        return rowTiles;
    }

    async testTheWallRowsKeepTheirCommittedOrder()
    {
        let config = this.setupWallsCompositeConfig('map-border-inner-walls-orientation');
        let testName = 'the top wall row sits directly below the top border and the middle row below it';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let wallsLayer = map.layers.find(layer => this.wallsLayerName === layer.name);
            this.assert(wallsLayer, 'The walls layer must exist to prove the wall rows orientation');
            let topCenterTile = MapTileKeyFinder.fetchTileGidByKey(map,'wall-top');
            let middleCenterTile = MapTileKeyFinder.fetchTileGidByKey(map,'wall-center');
            this.assert(topCenterTile, 'The real composite must provide the wall top center tile');
            this.assert(middleCenterTile, 'The real composite must provide the wall middle center tile');
            let firstRow = this.collectRowTiles(wallsLayer.data, map.width, 1);
            let secondRow = this.collectRowTiles(wallsLayer.data, map.width, 2);
            this.assert(
                -1 !== firstRow.indexOf(topCenterTile),
                'The row directly below the border must carry the wall top center tile'
            );
            this.assert(
                -1 !== secondRow.indexOf(middleCenterTile),
                'The second wall row must carry the wall middle center tile'
            );
            this.assertEqual(
                firstRow.indexOf(middleCenterTile),
                -1,
                'The middle wall row must never be drawn directly below the border'
            );
        });
    }

    async testTheWallRunEndsUseTheLeftAndRightWallTiles()
    {
        let config = this.setupWallsCompositeConfig('map-border-inner-walls-run-ends');
        let testName = 'the wall run ends use the left and right wall tiles';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let wallsLayer = map.layers.find(layer => this.wallsLayerName === layer.name);
            this.assert(wallsLayer, 'The walls layer must exist to prove the run ends');
            let topLeftTile = MapTileKeyFinder.fetchTileGidByKey(map,'wall-top-left');
            let topRightTile = MapTileKeyFinder.fetchTileGidByKey(map,'wall-top-right');
            this.assert(topLeftTile, 'The real composite must provide the wall top left tile');
            this.assert(topRightTile, 'The real composite must provide the wall top right tile');
            let firstRow = this.collectRowTiles(wallsLayer.data, map.width, 1);
            this.assertEqual(
                firstRow[1],
                topLeftTile,
                'The run left end takes the wall top left tile'
            );
            this.assertEqual(
                firstRow[map.width - 2],
                topRightTile,
                'The run right end takes the wall top right tile'
            );
        });
    }

    async testWallsLayerIsGeneratedFromTheRealWallAnnotations()
    {
        let config = this.setupWallsCompositeConfig('map-border-inner-walls-on');
        let testName = 'the map border inner walls layer is generated from the real wall- annotations';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let wallsLayer = map.layers.find(layer => this.wallsLayerName === layer.name);
            this.assert(
                wallsLayer,
                'applyMapBorderInnerWalls must produce the '+this.wallsLayerName+' layer, layers: '
                +map.layers.map(layer => layer.name).join(', ')
            );
            this.assert(
                0 < TileCountingUtility.countNonZeroTiles(wallsLayer.data),
                'An all zero walls layer means the wall tiles never resolved from the composite annotations'
            );
        });
    }

    async testWallsOccupyTheTwoRowsBelowTheTopBorder()
    {
        let config = this.setupWallsCompositeConfig('map-border-inner-walls-rows');
        let testName = 'the wall occupies the two rows below the top border and never any other row';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let wallsLayer = map.layers.find(layer => this.wallsLayerName === layer.name);
            this.assert(wallsLayer, 'The walls layer must exist to prove the wall rows');
            let firstRow = this.collectRowTiles(wallsLayer.data, map.width, 1);
            let secondRow = this.collectRowTiles(wallsLayer.data, map.width, 2);
            let thirdRow = this.collectRowTiles(wallsLayer.data, map.width, 3);
            this.assert(
                0 < TileCountingUtility.countNonZeroTiles(firstRow),
                'placeWallTiles writes the middle wall tile at y+1, so row 1 must hold wall tiles'
            );
            this.assert(
                0 < TileCountingUtility.countNonZeroTiles(secondRow),
                'placeWallTiles writes the top wall tile at y+2, so row 2 must hold wall tiles'
            );
            this.assertEqual(
                TileCountingUtility.countNonZeroTiles(thirdRow),
                0,
                'The two row wall must never reach row 3'
            );
            this.assertEqual(
                TileCountingUtility.countNonZeroTiles(this.collectRowTiles(wallsLayer.data, map.width, 0)),
                0,
                'The top border row itself must stay free of wall tiles'
            );
        });
    }

    appendBottomWallsWangtiles(tileMapJSON)
    {
        let wangset = tileMapJSON.tilesets[0].wangsets.find(entry => 'map-border-inner-walls' === entry.name);
        this.assert(wangset, 'The composite must carry the map border inner walls wangset');
        wangset.wangtiles.push({tileid: 162, wangid: [0, 0, 0, 0, 0, 0, 0, 1]});
        wangset.wangtiles.push({tileid: 163, wangid: [0, 1, 0, 0, 0, 0, 0, 1]});
        wangset.wangtiles.push({tileid: 164, wangid: [0, 1, 0, 0, 0, 0, 0, 0]});
        return tileMapJSON;
    }

    async testWallsUseThreeRowsWhenTheBottomTilesResolve()
    {
        let config = this.setupWallsCompositeConfig('map-border-inner-walls-three-rows');
        this.appendBottomWallsWangtiles(config.tileMapJSON);
        let testName = 'the wall occupies three rows when the bottom wall tiles resolve';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let wallsLayer = map.layers.find(layer => this.wallsLayerName === layer.name);
            this.assert(wallsLayer, 'The walls layer must exist to prove the third wall row');
            let firstRow = this.collectRowTiles(wallsLayer.data, map.width, 1);
            let secondRow = this.collectRowTiles(wallsLayer.data, map.width, 2);
            let thirdRow = this.collectRowTiles(wallsLayer.data, map.width, 3);
            this.assert(
                0 < TileCountingUtility.countNonZeroTiles(thirdRow),
                'With the bottom wall tiles resolved the wall must reach row 3'
            );
            this.assertEqual(
                TileCountingUtility.countNonZeroTiles(this.collectRowTiles(wallsLayer.data, map.width, 4)),
                0,
                'The three row wall must never reach row 4'
            );
            let middleColumn = Math.floor(map.width / 2);
            this.assert(
                thirdRow[middleColumn] !== firstRow[middleColumn],
                'The third wall row must use its own tile, not the first row tile'
            );
            this.assert(
                thirdRow[middleColumn] !== secondRow[middleColumn],
                'The third wall row must use its own tile, not the second row tile'
            );
        });
    }

    async testCornerColumnsAreSkippedBecauseTheSideBorderSitsBelowThem()
    {
        let config = this.setupWallsCompositeConfig('map-border-inner-walls-corners');
        let testName = 'the two corner columns hold no wall because the side border sits below them';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let wallsLayer = map.layers.find(layer => this.wallsLayerName === layer.name);
            this.assert(wallsLayer, 'The walls layer must exist to prove the skipped corner columns');
            let lastColumn = map.width - 1;
            this.assertEqual(wallsLayer.data[map.width], 0, 'The left corner column must be empty at row 1');
            this.assertEqual(wallsLayer.data[2 * map.width], 0, 'The left corner column must be empty at row 2');
            this.assertEqual(
                wallsLayer.data[map.width + lastColumn],
                0,
                'The right corner column must be empty at row 1'
            );
            this.assertEqual(
                wallsLayer.data[2 * map.width + lastColumn],
                0,
                'The right corner column must be empty at row 2'
            );
        });
    }

    async testWallsAreNotGeneratedWhenTheOptionIsDisabled()
    {
        let config = this.setupWallsCompositeConfig('map-border-inner-walls-off', {applyMapBorderInnerWalls: false});
        let testName = 'no walls layer is emitted when applyMapBorderInnerWalls is disabled';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            this.assert(
                !map.layers.find(layer => this.wallsLayerName === layer.name),
                'With the option disabled the map must not carry the '+this.wallsLayerName+' layer'
            );
            this.assert(
                LayerUtility.findLayer(map, 'collisions-map-border'),
                'The border itself must still be generated when only the walls option is disabled'
            );
        });
    }

    fetchOpeningStartColumn(borderLayer, mapWidth)
    {
        for(let columnIndex = 0; columnIndex < mapWidth; columnIndex++){
            if(0 === borderLayer.data[columnIndex]){
                return columnIndex;
            }
        }
        return -1;
    }

    async testWallsAreOpenedWhenTheEntryPositionIsOnTheTopBorder()
    {
        let config = this.setupWallsCompositeConfig(
            'map-border-inner-walls-top-entry',
            {entryPosition: 'top-middle', entryPositionSize: 2, mapSize: {mapWidth: 30, mapHeight: 30}}
        );
        let testName = 'a top border entry position opens the wall that would seal the opening';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            let wallsLayer = map.layers.find(layer => this.wallsLayerName === layer.name);
            this.assert(wallsLayer, 'The wall must still be generated when the opening is on the top border');
            let borderLayer = LayerUtility.findLayer(map, 'collisions-map-border');
            this.assert(borderLayer, 'The border layer must exist to locate the opening');
            let openingStart = this.fetchOpeningStartColumn(borderLayer, map.width);
            this.assert(0 < openingStart, 'The top border must hold the entry position opening');
            for(let i = 0; i < config.entryPositionSize; i++){
                this.assertEqual(
                    wallsLayer.data[map.width + openingStart + i],
                    0,
                    'The first wall row must be cleared over the opening column '+(openingStart + i)
                );
                this.assertEqual(
                    wallsLayer.data[2 * map.width + openingStart + i],
                    0,
                    'The second wall row must be cleared over the opening column '+(openingStart + i)
                );
            }
            this.assert(
                0 !== wallsLayer.data[map.width + openingStart - 1],
                'The wall run must keep an end tile on the left side of the opening'
            );
            this.assert(
                0 !== wallsLayer.data[map.width + openingStart + config.entryPositionSize],
                'The wall run must keep an end tile on the right side of the opening'
            );
        });
    }

    async testWallsAreGeneratedWhenTheEntryPositionIsOnTheBottomBorder()
    {
        let config = this.setupWallsCompositeConfig(
            'map-border-inner-walls-down-entry',
            {entryPosition: 'down-middle', entryPositionSize: 4}
        );
        let testName = 'a bottom border entry position leaves the top wall in place';
        await this.testWithDeterministicSeed(testName, config, 51515, async (map) => {
            this.assert(
                map.layers.find(layer => this.wallsLayerName === layer.name),
                'The opening is on the bottom border, so the top wall must still be generated'
            );
        });
    }

}

module.exports.TestMapBorderInnerWalls = TestMapBorderInnerWalls;
