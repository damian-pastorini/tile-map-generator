/**
 *
 * Reldens - Test Tile Shortcuts Mapper
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { TileShortcutsMapper } = require('../lib/map/tile-shortcuts-mapper');
const { TilesShortcuts } = require('../lib/map/tiles-shortcuts');

class TestTileShortcutsMapper extends BaseMapGeneratorTest
{

    buildGenerator()
    {
        let wangset = {name: 'path', wangtiles: [{tileid: 4, wangid: [0, 1, 0, 1, 0, 1, 0, 1]}]};
        let generator = {groundSpotsPropertiesMappers: {}, pathTile: 0};
        generator.optimizedMapFirstTileset = {firstgid: 1, tiles: [], wangsets: []};
        generator.optimizedMapFirstTileset.wangsets.push(wangset);
        return generator;
    }

    buildPropertiesMapper()
    {
        let mapper = {surroundingTilesPosition: {}, cornersPosition: {}};
        mapper.surroundingTilesPosition['ground-middle-center'] = 5;
        mapper.cornersPosition['ground-top-left'] = 10;
        return mapper;
    }

    async testMapTilesShortcutsReturnsInstance()
    {
        let generator = this.buildGenerator();
        let propertiesMapper = this.buildPropertiesMapper();
        await this.test('mapTilesShortcuts returns a TilesShortcuts instance', async () => {
            let mapper = new TileShortcutsMapper(generator);
            let shortcuts = mapper.mapTilesShortcuts('ground', 5, propertiesMapper);
            this.assert(shortcuts instanceof TilesShortcuts, 'Should return a TilesShortcuts instance');
            this.assertEqual(shortcuts.sMC, 5, 'Should map middle-center from the properties mapper');
        });
    }

    async testMapTilesShortcutsUpdatesGeneratorPathTile()
    {
        let generator = this.buildGenerator();
        await this.test('mapTilesShortcuts updates generator pathTile when replacement is set', async () => {
            let mapper = new TileShortcutsMapper(generator);
            let shortcuts = mapper.mapTilesShortcuts('path', 0, null);
            this.assertEqual(shortcuts.pathTileReplacement, 5, 'Replacement should come from wangset middle-center');
            this.assertEqual(generator.pathTile, 5, 'Generator pathTile should be updated to replacement');
        });
    }

    async testMapTilesShortcutsDoesNotUpdatePathTileWithoutReplacement()
    {
        let generator = this.buildGenerator();
        let propertiesMapper = this.buildPropertiesMapper();
        await this.test('mapTilesShortcuts keeps generator pathTile when no replacement', async () => {
            let mapper = new TileShortcutsMapper(generator);
            mapper.mapTilesShortcuts('ground', 5, propertiesMapper);
            this.assertEqual(generator.pathTile, 0, 'Generator pathTile should remain unchanged');
        });
    }

}

module.exports.TestTileShortcutsMapper = TestTileShortcutsMapper;
