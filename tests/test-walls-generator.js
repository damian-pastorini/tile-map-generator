/**
 *
 * Reldens - Test Walls Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { WallsGenerator } = require('../lib/generator/walls-generator');

class TestWallsGenerator extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            tileShortcutsMapper: {},
            bordersPatterns: {},
            mapLayersComposer: {}
        };
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    buildSpotTilesShortcuts()
    {
        return {cTL: 10, sTC: 11, cTR: 12, p: 1};
    }

    buildInnerWallsShortcuts()
    {
        return {sML: 20, cTL: 21, sMC: 22, sTC: 23, sMR: 24, cTR: 25};
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            this.assert(wallsGenerator instanceof WallsGenerator, 'Expected WallsGenerator instance');
            this.assert('function' === typeof wallsGenerator.isTopBorderTile, 'Expected isTopBorderTile method');
            this.assert('function' === typeof wallsGenerator.determineWallTiles, 'Expected determineWallTiles method');
        });
    }

    async testIsTopBorderTile()
    {
        await this.test('isTopBorderTile detects top-left, top-center and top-right tiles', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            let shortcuts = this.buildSpotTilesShortcuts();
            this.assertEqual(wallsGenerator.isTopBorderTile(10, shortcuts), true);
            this.assertEqual(wallsGenerator.isTopBorderTile(11, shortcuts), true);
            this.assertEqual(wallsGenerator.isTopBorderTile(12, shortcuts), true);
            this.assertEqual(wallsGenerator.isTopBorderTile(99, shortcuts), false);
        });
    }

    async testDetermineWallTilesTopLeft()
    {
        await this.test('determineWallTiles returns left wall pair for top-left tile', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            let result = wallsGenerator.determineWallTiles(this.buildInnerWallsShortcuts(), this.buildSpotTilesShortcuts(), 10);
            this.assertEqual(result[0], 20);
            this.assertEqual(result[1], 21);
        });
    }

    async testDetermineWallTilesTopCenter()
    {
        await this.test('determineWallTiles returns center wall pair for top-center tile', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            let result = wallsGenerator.determineWallTiles(this.buildInnerWallsShortcuts(), this.buildSpotTilesShortcuts(), 11);
            this.assertEqual(result[0], 22);
            this.assertEqual(result[1], 23);
        });
    }

    async testDetermineWallTilesNonBorder()
    {
        await this.test('determineWallTiles returns null for non-border tile', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            let result = wallsGenerator.determineWallTiles(this.buildInnerWallsShortcuts(), this.buildSpotTilesShortcuts(), 99);
            this.assertEqual(result, null);
        });
    }

    async testPlaceWallTiles()
    {
        await this.test('placeWallTiles writes both wall tiles below position', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            let width = 4;
            let data = Array(width * 4).fill(0);
            wallsGenerator.placeWallTiles(data, 1, 0, width, [20, 21]);
            this.assertEqual(data[1 * width + 1], 20);
            this.assertEqual(data[2 * width + 1], 21);
        });
    }

    async testPlaceOuterWallTileSkipsWalls()
    {
        await this.test('placeOuterWallTile skips positions already filled by walls layer', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            let width = 4;
            let outerWallsLayer = Array(width * 4).fill(0);
            let wallsLayer = Array(width * 4).fill(0);
            wallsLayer[1 * width + 1] = 7;
            let result = await wallsGenerator.placeOuterWallTile(
                outerWallsLayer,
                1,
                0,
                width,
                [50],
                [{x: 0, y: 1}],
                Array(width * 4).fill(0),
                wallsLayer
            );
            this.assertEqual(result[1 * width + 1], 0);
        });
    }

}

module.exports.TestWallsGenerator = TestWallsGenerator;
