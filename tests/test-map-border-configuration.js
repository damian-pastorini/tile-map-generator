/**
 *
 * Reldens - Test Map Border Configuration
 *
 * Real-map proving tests for the map border configuration. Every case generates a complete map using the
 * committed real element files under a fixed seed, and compares the full result against a per-case committed
 * deterministic expected map file under tests/test-data (materialized on first run, then committed). The
 * cases prove the exact border tiles per side and corner (bordersTiles) and the exact entry position gap
 * (entryPosition and entryPositionSize), so both can be verified visually by opening the expected map in
 * Tiled.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');
const { MapTileKeyFinder } = require('./map-tile-key-finder');
const { TileCountingUtility } = require('../lib/map/tile-counting-utility');
const { LayerUtility } = require('../lib/map/layer-utility');
const { FileHandler } = require('@reldens/server-utils');

class TestMapBorderConfiguration extends BaseExpectedMapTest
{

    buildBorderWallsConfig(mapName)
    {
        return this.setupWallsCompositeConfig(mapName, {
            collisionLayersForPaths: ['collisions', 'over-player', 'shadow', 'base']
        });
    }

    copyTilesetImageNextToExpectedMap(mapName)
    {
        return FileHandler.copyFile(
            FileHandler.joinPaths(this.testDataFolder, 'generated', mapName+'.png'),
            FileHandler.joinPaths(this.testDataFolder, mapName+'.png')
        );
    }

    async testMapBorderWallsMatchCommittedExpectedMap()
    {
        await this.test('the map border walls and the entry opening land on the expected map', async () => {
            let config = this.buildBorderWallsConfig('map-border-walls');
            let result = await this.generateSeededResult(config, 51515);
            let copied = this.copyTilesetImageNextToExpectedMap('map-border-walls');
            this.assert(copied, 'The border walls tileset image must be copied next to the expected map');
            let expected = this.loadOrCreateExpectedMap('map-border-walls-expected.json', result.map);
            this.compareMapOutputs(expected, result.map);
            let wallsLayer = result.map.layers.find(layer => 'map-border-inner-walls-collisions' === layer.name);
            this.assert(wallsLayer, 'The generated map must contain the map border inner walls layer');
            this.assert(
                0 < TileCountingUtility.countNonZeroTiles(wallsLayer.data),
                'An all zero walls layer means the wall tiles never resolved from the composite annotations'
            );
            let borderLayer = result.map.layers.find(layer => 'collisions-map-border' === layer.name);
            this.assert(borderLayer, 'The generated map must contain the collisions-map-border layer');
            this.assertEqual(
                this.fetchOpeningStartColumn(borderLayer, result.map.width, result.map.height - 1),
                -1,
                'The walls map has no entry position, so the bottom border must stay closed'
            );
        });
    }

    buildBorderConfig(mapName, overrides)
    {
        let config = this.applyScenarioDefaults(this.setupBasicConfig(), mapName, 30, 30);
        config.placeElementsOrder = 'inOrder';
        config.orderElementsBySize = false;
        return Object.assign(config, overrides);
    }

    buildAllBordersTiles()
    {
        return {
            'top': 124,
            'right': 129,
            'bottom': 131,
            'left': 126,
            'top-left': 127,
            'top-right': 130,
            'bottom-left': 132,
            'bottom-right': 133
        };
    }

    async testCustomBorderTilesMatchCommittedExpectedMap()
    {
        await this.test('bordersTiles per side and corner land on the exact border indexes of the expected map', async () => {
            let config = this.buildBorderConfig('map-border-custom-tiles', {
                bordersTiles: this.buildAllBordersTiles()
            });
            let result = await this.runExpectedMapScenario(config, 44444, 'map-border-custom-tiles-expected.json');
            let borderLayer = result.map.layers.find(layer => 'collisions-map-border' === layer.name);
            this.assert(borderLayer, 'The generated map must contain the collisions-map-border layer');
            this.assertEqual(borderLayer.data[0], 127, 'Top-left corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[29], 130, 'Top-right corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[870], 132, 'Bottom-left corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[899], 133, 'Bottom-right corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[1], 124, 'Top edge must use the configured top tile');
            this.assertEqual(borderLayer.data[30], 126, 'Left edge must use the configured left tile');
            this.assertEqual(borderLayer.data[59], 129, 'Right edge must use the configured right tile');
            this.assertEqual(borderLayer.data[871], 131, 'Bottom edge must use the configured bottom tile');
        });
    }

    buildInnerCornerAnnotations()
    {
        return [
            {id: 1160, key: 'border-inner-corner-top-left'},
            {id: 1164, key: 'border-inner-corner-top-right'},
            {id: 1166, key: 'border-inner-corner-bottom-left'},
            {id: 1167, key: 'border-inner-corner-bottom-right'}
        ];
    }

    appendBorderInnerCorners(tileMapJSON)
    {
        let tileset = tileMapJSON.tilesets[0];
        let bordersLayer = LayerUtility.findLayer(tileMapJSON, 'borders', 'exact');
        this.assert(bordersLayer, 'The composite must carry the borders layer to park the inner corner tiles');
        let parkedIndex = bordersLayer.data.indexOf(0);
        for(let annotation of this.buildInnerCornerAnnotations()){
            tileset.tiles.push({
                id: annotation.id,
                properties: [{name: 'key', type: 'string', value: annotation.key}]
            });
            bordersLayer.data[parkedIndex] = tileset.firstgid + annotation.id;
            parkedIndex++;
        }
        return tileMapJSON;
    }

    buildOpeningEndsConfig(mapName, entryPosition)
    {
        let config = this.setupWallsCompositeConfig(mapName, {
            entryPosition: entryPosition,
            entryPositionSize: 2,
            mapSize: {mapWidth: 30, mapHeight: 30},
            collisionLayersForPaths: ['collisions', 'over-player', 'shadow', 'base']
        });
        this.appendBorderInnerCorners(config.tileMapJSON);
        return config;
    }

    fetchOpeningStartColumn(borderLayer, mapWidth, rowIndex)
    {
        for(let columnIndex = 0; columnIndex < mapWidth; columnIndex++){
            if(0 === borderLayer.data[rowIndex * mapWidth + columnIndex]){
                return columnIndex;
            }
        }
        return -1;
    }

    assertOpeningEndsUseTheInnerCorners(map, rowIndex, entryPositionSize, leftEndKey, rightEndKey)
    {
        let borderLayer = LayerUtility.findLayer(map, 'collisions-map-border', 'exact');
        this.assert(borderLayer, 'The generated map must contain the collisions-map-border layer');
        let openingStart = this.fetchOpeningStartColumn(borderLayer, map.width, rowIndex);
        this.assert(0 < openingStart, 'The border row must hold the entry position opening');
        let leftEndTile = MapTileKeyFinder.fetchTileGidByKey(map, leftEndKey);
        let rightEndTile = MapTileKeyFinder.fetchTileGidByKey(map, rightEndKey);
        this.assert(leftEndTile, 'The optimized tileset must keep the '+leftEndKey+' tile');
        this.assert(rightEndTile, 'The optimized tileset must keep the '+rightEndKey+' tile');
        let rowStart = rowIndex * map.width;
        this.assertEqual(
            borderLayer.data[rowStart + openingStart - 1],
            leftEndTile,
            'The opening left end must take the '+leftEndKey+' tile'
        );
        this.assertEqual(
            borderLayer.data[rowStart + openingStart + entryPositionSize],
            rightEndTile,
            'The opening right end must take the '+rightEndKey+' tile'
        );
    }

    async testBottomOpeningEndsUseTheRotatedInnerCorners()
    {
        await this.test('the bottom entry opening ends use the rotated border inner corners', async () => {
            let config = this.buildOpeningEndsConfig('map-border-opening-ends-down', 'down-middle');
            let result = await this.runExpectedMapScenario(config, 51515, 'map-border-opening-ends-down-expected.json');
            this.assert(
                this.copyTilesetImageNextToExpectedMap('map-border-opening-ends-down'),
                'The tileset image must be copied next to the expected map'
            );
            this.assertOpeningEndsUseTheInnerCorners(
                result.map,
                result.map.height - 1,
                config.entryPositionSize,
                'border-inner-corner-top-right',
                'border-inner-corner-top-left'
            );
        });
    }

    async testTopOpeningEndsUseTheRotatedInnerCorners()
    {
        await this.test('the top entry opening ends use the rotated border inner corners', async () => {
            let config = this.buildOpeningEndsConfig('map-border-opening-ends-top', 'top-middle');
            let result = await this.runExpectedMapScenario(config, 51515, 'map-border-opening-ends-top-expected.json');
            this.assert(
                this.copyTilesetImageNextToExpectedMap('map-border-opening-ends-top'),
                'The tileset image must be copied next to the expected map'
            );
            this.assertOpeningEndsUseTheInnerCorners(
                result.map,
                0,
                config.entryPositionSize,
                'border-inner-corner-bottom-right',
                'border-inner-corner-bottom-left'
            );
        });
    }

    async testEntryPositionOpensExactGapOnCommittedExpectedMap()
    {
        await this.test('entryPosition down-middle with size four opens the exact border gap on the expected map', async () => {
            let config = this.buildBorderConfig('map-border-entry-position', {
                entryPosition: 'down-middle',
                entryPositionSize: 4
            });
            let result = await this.runExpectedMapScenario(config, 44444, 'map-border-entry-position-expected.json');
            let borderLayer = result.map.layers.find(layer => 'collisions-map-border' === layer.name);
            this.assert(borderLayer, 'The generated map must contain the collisions-map-border layer');
            this.assertEqual(borderLayer.data[883], 0, 'The entry gap first tile must clear the border');
            this.assertEqual(borderLayer.data[884], 0, 'The entry gap second tile must clear the border');
            this.assertEqual(borderLayer.data[885], 0, 'The entry gap third tile must clear the border');
            this.assertEqual(borderLayer.data[886], 0, 'The entry gap fourth tile must clear the border');
            this.assertEqual(borderLayer.data[882], 116, 'The border must continue before the entry gap');
            this.assertEqual(borderLayer.data[887], 116, 'The border must continue after the entry gap');
            let changePointsLayer = result.map.layers.find(
                layer => 'return-to-main-map-change-points' === layer.name
            );
            this.assert(changePointsLayer, 'The entry position must record the return to main map layer');
            this.assertEqual(changePointsLayer.data[883], 116, 'The entry gap must hold the change point tiles');
            this.assertEqual(changePointsLayer.data[886], 116, 'The entry gap must hold the change point tiles end');
        });
    }

}

module.exports.TestMapBorderConfiguration = TestMapBorderConfiguration;
