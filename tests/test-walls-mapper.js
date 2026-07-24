/**
 *
 * Reldens - Test Walls Mapper
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { WallsMapper } = require('../lib/map/walls-mapper');

class TestWallsMapper extends BaseMapGeneratorTest
{

    buildSpotTiles()
    {
        let spotTiles = {sML: 1, sMR: 2, sTC: 3, sBC: 4, sTL: 5, sTR: 6, sBL: 7, sBR: 8};
        spotTiles.cTL = 9;
        spotTiles.cTR = 10;
        spotTiles.cBL = 11;
        spotTiles.cBR = 12;
        return spotTiles;
    }

    buildWallTiles()
    {
        let wallTiles = {p: 100, sTC: 103, sML: 101, sMR: 102};
        wallTiles.cTR = 110;
        wallTiles.cTL = 111;
        return wallTiles;
    }

    async testMappedPositionsKeyedByTileGid()
    {
        let spotTiles = this.buildSpotTiles();
        let wallTiles = this.buildWallTiles();
        await this.test('mappedPositions returns offsets keyed by spot tile gid', async () => {
            let mapper = new WallsMapper(spotTiles, wallTiles);
            let positions = mapper.mappedPositions();
            this.assertDeepEqual(positions[1], [{x: -1, y: 0}], 'sML should map to a single left offset');
            this.assertDeepEqual(positions[2], [{x: 1, y: 0}], 'sMR should map to a single right offset');
            this.assertDeepEqual(positions[3], [{x: 0, y: -1}], 'sTC should map to a single up offset');
            this.assertEqual(positions[4].length, 3, 'sBC should map to three offsets');
        });
    }

    async testMappedPositionsCornerOffsets()
    {
        let spotTiles = this.buildSpotTiles();
        let wallTiles = this.buildWallTiles();
        await this.test('mappedPositions maps corner tiles to diagonal offsets', async () => {
            let mapper = new WallsMapper(spotTiles, wallTiles);
            let positions = mapper.mappedPositions();
            this.assertDeepEqual(positions[9], [{x: -1, y: -1}], 'cTL should map to top-left diagonal');
            this.assertDeepEqual(positions[12], [{x: 1, y: 1}], 'cBR should map to bottom-right diagonal');
        });
    }

    async testOppositeTilesKeyedByTileGid()
    {
        let spotTiles = this.buildSpotTiles();
        let wallTiles = this.buildWallTiles();
        await this.test('oppositeTiles returns opposite tile lists keyed by spot tile gid', async () => {
            let mapper = new WallsMapper(spotTiles, wallTiles);
            let opposites = mapper.oppositeTiles();
            this.assertDeepEqual(opposites[1], [2], 'sML opposite should be sMR');
            this.assertDeepEqual(opposites[2], [1], 'sMR opposite should be sML');
            this.assertDeepEqual(opposites[3], [4], 'sTC opposite should be sBC');
        });
    }

    async testOppositeTilesIncludeWallTiles()
    {
        let spotTiles = this.buildSpotTiles();
        let wallTiles = this.buildWallTiles();
        await this.test('oppositeTiles includes wall tiles in complex sequences', async () => {
            let mapper = new WallsMapper(spotTiles, wallTiles);
            let opposites = mapper.oppositeTiles();
            this.assertDeepEqual(opposites[4], [3, 100, 103], 'sBC opposites should include the wall path and wall top-center');
            this.assertEqual(opposites[7].length, 7, 'sBL should provide seven opposite tiles');
        });
    }

}

module.exports.TestWallsMapper = TestWallsMapper;
