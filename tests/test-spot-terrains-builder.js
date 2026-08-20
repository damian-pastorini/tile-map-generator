/**
 *
 * Reldens - Test Spot Terrains Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotTerrainsBuilder } = require('../lib/map/spot-terrains-builder');

class TestSpotTerrainsBuilder extends BaseMapGeneratorTest
{

    buildMappedPositions()
    {
        return {
            surroundingTilesPosition: {
                'middle-center': 5,
                'top-left': 1,
                'top-center': 2
            },
            cornersPosition: {
                'top-left': 9
            }
        };
    }

    fetchWangIdByTileId(wangset, tileId)
    {
        for(let wangtile of wangset.wangtiles){
            if(tileId === wangtile.tileid){
                return wangtile.wangid.join(',');
            }
        }
        return '';
    }

    async testBuildsOneWangsetPerTerrain()
    {
        await this.test('builds one wangset per spot terrain', async () => {
            let wangsets = SpotTerrainsBuilder.build({cave: this.buildMappedPositions()}, 20, 1);
            this.assertEqual(wangsets.length, 1, 'One terrain should produce one wangset');
            this.assertEqual(wangsets[0].name, 'cave', 'The wangset name should be the terrain name');
            this.assertEqual(wangsets[0].type, 'mixed', 'The wangset type should be mixed');
            this.assertEqual(wangsets[0].wangtiles.length, 4, 'Every mapped position should produce a wangtile');
        });
    }

    async testTileIdsAreTheGidMinusTheFirstGid()
    {
        await this.test('the wangtiles tile ids are the gids minus the first gid', async () => {
            let wangsets = SpotTerrainsBuilder.build({cave: this.buildMappedPositions()}, 20, 1);
            this.assertEqual(wangsets[0].tile, 4, 'The main tile should be the middle-center gid minus the first gid');
            this.assertEqual(
                this.fetchWangIdByTileId(wangsets[0], 4),
                '0,1,0,1,0,1,0,1',
                'The middle-center tile should carry the middle-center wangid'
            );
            this.assertEqual(
                this.fetchWangIdByTileId(wangsets[0], 0),
                '0,0,0,1,0,0,0,0',
                'The top-left tile should carry the top-left wangid'
            );
            this.assertEqual(
                this.fetchWangIdByTileId(wangsets[0], 8),
                '0,1,0,1,0,1,0,0',
                'The top-left corner tile should carry the top-left corner wangid'
            );
        });
    }

    async testColorsAreCreatedForEveryTerrain()
    {
        await this.test('every terrain gets one color', async () => {
            let wangsets = SpotTerrainsBuilder.build(
                {cave: this.buildMappedPositions(), forest: this.buildMappedPositions()},
                20,
                1
            );
            this.assertEqual(wangsets[0].colors.length, 1, 'The terrain should have one color');
            this.assertEqual(wangsets[0].colors[0].name, 'cave', 'The color name should be the terrain name');
            this.assertEqual(wangsets[0].colors[0].tile, 4, 'The color tile should be the terrain main tile');
            this.assertEqual(wangsets[1].colors[0].name, 'forest', 'Every terrain color should be named after it');
            this.assertEqual(
                wangsets[0].colors[0].color,
                wangsets[1].colors[0].color,
                'Every terrain uses the same color, the terrain is identified by its name'
            );
        });
    }

    async testTilesOutOfTheTilesetAreSkipped()
    {
        await this.test('tiles out of the map tileset are not included', async () => {
            let mappedPositions = {surroundingTilesPosition: {'middle-center': 5, 'top-left': 99}, cornersPosition: {}};
            let wangsets = SpotTerrainsBuilder.build({cave: mappedPositions}, 20, 1);
            this.assertEqual(wangsets[0].wangtiles.length, 1, 'Only the tile inside the tileset should be included');
            this.assertEqual(wangsets[0].wangtiles[0].tileid, 4, 'The included tile should be the middle-center one');
        });
    }

    async testTerrainsWithoutTilesAreSkipped()
    {
        await this.test('terrains without any valid tile are not created', async () => {
            let wangsets = SpotTerrainsBuilder.build(
                {cave: {surroundingTilesPosition: {}, cornersPosition: {}}},
                20,
                1
            );
            this.assertEqual(wangsets.length, 0, 'A terrain without tiles should not create a wangset');
        });
    }

    async testEmptyTerrainsListReturnsEmptyArray()
    {
        await this.test('an empty terrains list returns an empty wangsets array', async () => {
            this.assertEqual(SpotTerrainsBuilder.build({}, 20, 1).length, 0, 'No terrains should return no wangsets');
            this.assertEqual(SpotTerrainsBuilder.build(false, 20, 1).length, 0, 'A missing terrains list should be safe');
        });
    }

}

module.exports.TestSpotTerrainsBuilder = TestSpotTerrainsBuilder;
