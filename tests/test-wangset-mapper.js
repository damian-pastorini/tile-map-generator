/**
 *
 * Reldens - Test Wangset Mapper
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { WangsetMapper } = require('../lib/map/wangset-mapper');

class TestWangsetMapper extends BaseMapGeneratorTest
{

    buildWangset()
    {
        let wangset = {name: 'path', firstgid: 100, wangtiles: [], tilesProperties: []};
        wangset.wangtiles.push({tileid: 0, wangid: [0, 1, 0, 1, 0, 1, 0, 1]});
        wangset.wangtiles.push({tileid: 1, wangid: [0, 0, 0, 1, 0, 0, 0, 0]});
        wangset.wangtiles.push({tileid: 2, wangid: [0, 0, 0, 1, 0, 1, 0, 0]});
        return wangset;
    }

    async testMapsMiddleCenterAsMainTile()
    {
        let wangset = this.buildWangset();
        await this.test('maps middle-center wangtile as main tile with firstgid offset', async () => {
            let mapper = new WangsetMapper(wangset);
            this.assertEqual(mapper.mainTile, 100, 'Main tile should be tileid 0 plus firstgid 100');
            this.assertEqual(mapper.surroundingTilesPosition['middle-center'], 100, 'middle-center position should be mapped');
        });
    }

    async testMapsSurroundingPositions()
    {
        let wangset = this.buildWangset();
        await this.test('maps surrounding positions from wangids', async () => {
            let mapper = new WangsetMapper(wangset);
            this.assertEqual(mapper.surroundingTilesPosition['top-left'], 101, 'top-left should be tileid 1 plus firstgid');
            this.assertEqual(mapper.surroundingTilesPosition['top-center'], 102, 'top-center should be tileid 2 plus firstgid');
        });
    }

    async testMapsCornerPositions()
    {
        let wangset = {name: 'path', firstgid: 10, wangtiles: [], tilesProperties: []};
        wangset.wangtiles.push({tileid: 5, wangid: [0, 1, 0, 1, 0, 1, 0, 0]});
        wangset.wangtiles.push({tileid: 6, wangid: [0, 0, 0, 1, 0, 1, 0, 1]});
        await this.test('maps corner positions when wangid matches a corner pattern', async () => {
            let mapper = new WangsetMapper(wangset);
            this.assertEqual(mapper.cornersPosition['top-left'], 15, 'top-left corner should be tileid 5 plus firstgid 10');
            this.assertEqual(mapper.cornersPosition['top-right'], 16, 'top-right corner should be tileid 6 plus firstgid 10');
        });
    }

    async testInvertMapInvertsKeysAndValues()
    {
        let wangset = this.buildWangset();
        await this.test('invertMap swaps keys and values', async () => {
            let mapper = new WangsetMapper(wangset);
            let inverted = mapper.invertMap({a: '1', b: '2'});
            this.assertEqual(inverted['1'], 'a', 'Value 1 should map back to key a');
            this.assertEqual(inverted['2'], 'b', 'Value 2 should map back to key b');
        });
    }

    async testFetchTopCenterReturnsZeroWithoutProperties()
    {
        let wangset = {name: 'path', firstgid: 1, wangtiles: [], tilesProperties: null};
        await this.test('fetchTopCenterTile returns zero when no tiles properties', async () => {
            let mapper = new WangsetMapper(wangset);
            this.assertEqual(mapper.topCenter, 0, 'topCenter should be zero without tiles properties');
        });
    }

    async testFetchTopCenterReadsKeyProperty()
    {
        let wangset = {name: 'path', firstgid: 50, wangtiles: [], tilesProperties: []};
        wangset.tilesProperties.push({id: 3, properties: [{name: 'key', value: 'top-center'}]});
        await this.test('fetchTopCenterTile reads tile flagged with key top-center', async () => {
            let mapper = new WangsetMapper(wangset);
            this.assertEqual(mapper.topCenter, 53, 'topCenter should be tile id 3 plus firstgid 50');
        });
    }

    async testHandlesEmptyWangtiles()
    {
        let wangset = {name: 'path', firstgid: 1, wangtiles: [], tilesProperties: []};
        await this.test('handles wangset with no wangtiles', async () => {
            let mapper = new WangsetMapper(wangset);
            this.assertEqual(mapper.mainTile, 0, 'Main tile should remain zero');
            this.assertEqual(Object.keys(mapper.surroundingTilesPosition).length, 0, 'No surrounding tiles should be mapped');
        });
    }

    async testMapPositionsFromWangsetGuardsFalsyWangset()
    {
        let wangset = {name: 'path', firstgid: 1, wangtiles: [], tilesProperties: []};
        await this.test('mapPositionsFromWangset returns early without mutating positions for a falsy wangset', async () => {
            let mapper = new WangsetMapper(wangset);
            mapper.surroundingTilesPosition['middle-center'] = 7;
            mapper.mapPositionsFromWangset(false);
            this.assertEqual(mapper.surroundingTilesPosition['middle-center'], 7, 'Existing positions should be untouched');
            this.assertEqual(Object.keys(mapper.cornersPosition).length, 0, 'No corners should be added for a falsy wangset');
        });
    }

    async testInvertMapHandlesEmptySource()
    {
        let wangset = this.buildWangset();
        await this.test('invertMap returns an empty object for an empty source map', async () => {
            let mapper = new WangsetMapper(wangset);
            let inverted = mapper.invertMap({});
            this.assertEqual(Object.keys(inverted).length, 0, 'Inverting an empty map should yield an empty map');
        });
    }

}

module.exports.TestWangsetMapper = TestWangsetMapper;
