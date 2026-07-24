/**
 *
 * Reldens - Test Tiles Shortcuts
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { TilesShortcuts } = require('../lib/map/tiles-shortcuts');

class TestTilesShortcuts extends BaseMapGeneratorTest
{

    buildSurrounding()
    {
        let surrounding = {};
        surrounding['top-left'] = 1;
        surrounding['top-center'] = 2;
        surrounding['top-right'] = 3;
        surrounding['middle-left'] = 4;
        surrounding['middle-center'] = 5;
        surrounding['middle-right'] = 6;
        surrounding['bottom-left'] = 7;
        surrounding['bottom-center'] = 8;
        surrounding['bottom-right'] = 9;
        return surrounding;
    }

    buildCorners()
    {
        let corners = {};
        corners['top-left'] = 10;
        corners['top-right'] = 11;
        corners['bottom-left'] = 12;
        corners['bottom-right'] = 13;
        return corners;
    }

    buildWangsetTileset()
    {
        let wangset = {name: 'path', wangtiles: [{tileid: 4, wangid: [0, 1, 0, 1, 0, 1, 0, 1]}]};
        let tileset = {firstgid: 1, tiles: [], wangsets: []};
        tileset.wangsets.push(wangset);
        return tileset;
    }

    async testConstructorMapsSurroundingTiles()
    {
        let surrounding = this.buildSurrounding();
        let corners = this.buildCorners();
        await this.test('constructor maps surrounding and corner tiles', async () => {
            let shortcuts = new TilesShortcuts(50, surrounding, corners, '', {});
            this.assertEqual(shortcuts.sTL, 1, 'sTL should map to top-left');
            this.assertEqual(shortcuts.sMC, 5, 'sMC should map to middle-center');
            this.assertEqual(shortcuts.sBR, 9, 'sBR should map to bottom-right');
            this.assertEqual(shortcuts.cTL, 10, 'cTL should map to corner top-left');
            this.assertEqual(shortcuts.cBR, 13, 'cBR should map to corner bottom-right');
            this.assertEqual(shortcuts.p, 50, 'Path tile should be the provided path tile');
        });
    }

    async testConstructorUsesPrefix()
    {
        let surrounding = {'wall-top-left': 21, 'wall-middle-center': 25};
        await this.test('constructor applies prefix to surrounding tile keys', async () => {
            let shortcuts = new TilesShortcuts(0, surrounding, {}, 'wall-', {});
            this.assertEqual(shortcuts.sTL, 21, 'Prefixed top-left should be mapped');
            this.assertEqual(shortcuts.sMC, 25, 'Prefixed middle-center should be mapped');
        });
    }

    async testConstructorPathFallsBackToMiddleCenter()
    {
        let surrounding = {'middle-center': 99};
        await this.test('constructor falls back path tile to middle-center when path is zero', async () => {
            let shortcuts = new TilesShortcuts(0, surrounding, {}, '', {});
            this.assertEqual(shortcuts.p, 99, 'Path should fall back to middle-center when path tile is zero');
        });
    }

    async testConstructorReadsTopCenterFromMappedData()
    {
        let mappedData = {topCenter: 77};
        await this.test('constructor reads topCenter from original mapped data', async () => {
            let shortcuts = new TilesShortcuts(5, {}, {}, '', mappedData);
            this.assertEqual(shortcuts.tC, 77, 'topCenter should be read from mapped data');
        });
    }

    async testFetchWangsetByNameReturnsFalseWithoutWangsets()
    {
        let emptyTileset = {};
        await this.test('fetchWangsetByName returns false when there are no wangsets', async () => {
            this.assertEqual(TilesShortcuts.fetchWangsetByName('path', emptyTileset), false, 'Missing wangsets returns false');
            this.assertEqual(TilesShortcuts.fetchWangsetByName('path', null), false, 'Null tileset returns false');
        });
    }

    async testFetchWangsetByNameReturnsFalseWhenNameMissing()
    {
        let tileset = this.buildWangsetTileset();
        await this.test('fetchWangsetByName returns false when name not present', async () => {
            this.assertEqual(TilesShortcuts.fetchWangsetByName('ground', tileset), false, 'Unknown wangset name returns false');
        });
    }

    async testFetchWangsetByNameReturnsMatch()
    {
        let tileset = this.buildWangsetTileset();
        await this.test('fetchWangsetByName returns the matching wangset with firstgid and tilesProperties', async () => {
            let wangset = TilesShortcuts.fetchWangsetByName('path', tileset);
            this.assert(wangset, 'Matching wangset should be returned');
            this.assertEqual(wangset.name, 'path', 'Returned wangset name should match');
            this.assertEqual(wangset.firstgid, 1, 'firstgid should be set from tileset');
            this.assert(Array.isArray(wangset.tilesProperties), 'tilesProperties should be set');
        });
    }

    async testMapWangsetDataReturnsWangsetMapper()
    {
        let tileset = this.buildWangsetTileset();
        await this.test('mapWangsetData returns a WangsetMapper with mapped positions', async () => {
            let mapped = TilesShortcuts.mapWangsetData('path', tileset);
            this.assertEqual(mapped.mainTile, 5, 'Main tile should be tileid plus firstgid');
            this.assertEqual(mapped.surroundingTilesPosition['middle-center'], 5, 'middle-center should be mapped');
        });
    }

    async testFromPropertiesMappersListUsesWangsetWhenNoMapper()
    {
        let tileset = this.buildWangsetTileset();
        await this.test('fromPropertiesMappersList builds from wangset when no properties mapper', async () => {
            let instance = TilesShortcuts.fromPropertiesMappersList('path', 0, null, '', {}, tileset);
            this.assert(instance instanceof TilesShortcuts, 'Should return a TilesShortcuts instance');
            this.assertEqual(instance.pathTileReplacement, 5, 'pathTileReplacement should be middle-center from wangset');
        });
    }

    async testFromPropertiesMappersListUsesPropertiesMapperWithPrefix()
    {
        let propertiesMapper = {surroundingTilesPosition: {}, cornersPosition: {}};
        propertiesMapper.surroundingTilesPosition['ground-middle-center'] = 55;
        propertiesMapper.surroundingTilesPosition['ground-top-left'] = 51;
        propertiesMapper.cornersPosition['ground-top-left'] = 60;
        await this.test('fromPropertiesMappersList uses the properties mapper and applies the tilesKey prefix', async () => {
            let instance = TilesShortcuts.fromPropertiesMappersList('ground', 55, propertiesMapper, '', {}, null);
            this.assert(instance instanceof TilesShortcuts, 'Should return a TilesShortcuts instance');
            this.assertEqual(instance.sMC, 55, 'middle-center should be read with the ground- prefix');
            this.assertEqual(instance.sTL, 51, 'top-left should be read with the ground- prefix');
            this.assertEqual(instance.cTL, 60, 'corner top-left should be read with the ground- prefix');
            this.assertEqual(instance.p, 55, 'path tile should be the provided main tile');
            this.assertEqual(instance.pathTileReplacement, null, 'No path replacement for a non-path tilesKey');
        });
    }

    async testFromPropertiesMappersListResolvesSuffixFromGroundSpots()
    {
        let groundSpotsPropertiesMappers = {};
        groundSpotsPropertiesMappers['ground-spot'] = {
            surroundingTilesPosition: {'ground-spot-middle-center': 77, 'ground-spot-top-left': 71},
            cornersPosition: {'ground-spot-top-left': 88}
        };
        await this.test('fromPropertiesMappersList resolves a suffixed key from groundSpotsPropertiesMappers', async () => {
            let instance = TilesShortcuts.fromPropertiesMappersList(
                'ground',
                77,
                null,
                '-spot',
                groundSpotsPropertiesMappers,
                null
            );
            this.assertEqual(instance.sMC, 77, 'middle-center should be read with the ground-spot- prefix');
            this.assertEqual(instance.sTL, 71, 'top-left should be read with the ground-spot- prefix');
            this.assertEqual(instance.cTL, 88, 'corner top-left should be read with the ground-spot- prefix');
        });
    }

    async testFromPropertiesMappersListFallsBackToWangsetWhenCornersEmpty()
    {
        let tileset = this.buildWangsetTileset();
        let propertiesMapper = {surroundingTilesPosition: {'ground-middle-center': 5}, cornersPosition: {}};
        await this.test('fromPropertiesMappersList falls back to wangset data when corners are empty', async () => {
            let instance = TilesShortcuts.fromPropertiesMappersList('path', 0, propertiesMapper, '', {}, tileset);
            this.assertEqual(instance.sMC, 5, 'middle-center should come from the wangset fallback');
            this.assertEqual(instance.pathTileReplacement, 5, 'pathTileReplacement should be set from the wangset fallback');
        });
    }

}

module.exports.TestTilesShortcuts = TestTilesShortcuts;
