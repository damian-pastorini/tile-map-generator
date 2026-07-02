/**
 *
 * Reldens - Test Walls Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { WallsGenerator } = require('../lib/generator/walls-generator');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { BordersPatterns } = require('../lib/patterns/borders-patterns');
const { MapLayersComposer } = require('../lib/generator/map-layers-composer');

class TestWallsGenerator extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            tileShortcutsMapper: {},
            bordersPatterns: {},
            mapLayersComposer: {}
        };
        if(!overrides){
            return generator;
        }
        for(let overrideKey of Object.keys(overrides)){
            generator[overrideKey] = overrides[overrideKey];
        }
        return generator;
    }

    buildSpotTilesShortcuts()
    {
        let shortcuts = {cTL: 10, sTC: 11};
        shortcuts.cTR = 12;
        shortcuts.p = 1;
        return shortcuts;
    }

    buildInnerWallsShortcuts()
    {
        let shortcuts = {sML: 20, cTL: 21};
        shortcuts.sMC = 22;
        shortcuts.sTC = 23;
        shortcuts.sMR = 24;
        shortcuts.cTR = 25;
        return shortcuts;
    }

    buildFullSpotTiles()
    {
        let shortcuts = {p: 101, tC: 102};
        shortcuts.sTL = 103;
        shortcuts.sTC = 104;
        shortcuts.sTR = 105;
        shortcuts.sMC = 106;
        shortcuts.sML = 107;
        shortcuts.sMR = 108;
        shortcuts.sBL = 109;
        shortcuts.sBC = 110;
        shortcuts.sBR = 111;
        shortcuts.cTL = 112;
        shortcuts.cTR = 113;
        shortcuts.cBL = 114;
        shortcuts.cBR = 115;
        return shortcuts;
    }

    buildOuterTiles()
    {
        let shortcuts = {p: 201, tC: 202};
        shortcuts.sTL = 203;
        shortcuts.sTC = 204;
        shortcuts.sTR = 205;
        shortcuts.sMC = 206;
        shortcuts.sML = 207;
        shortcuts.sMR = 208;
        shortcuts.sBL = 209;
        shortcuts.sBC = 210;
        shortcuts.sBR = 211;
        shortcuts.cTL = 212;
        shortcuts.cTR = 213;
        shortcuts.cBL = 214;
        shortcuts.cBR = 215;
        return shortcuts;
    }

    buildWallsGenerator(mappedTiles)
    {
        return {
            bordersPatterns: new BordersPatterns(),
            mapLayersComposer: new MapLayersComposer({layerDataFactory: new LayerDataFactory()}),
            tileShortcutsMapper: {
                mapTilesShortcuts: () => {
                    return mappedTiles;
                }
            }
        };
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

    async testDetermineWallTilesTopRight()
    {
        await this.test('determineWallTiles returns right wall pair for top-right tile', async () => {
            let wallsGenerator = new WallsGenerator(this.buildGeneratorStub());
            let result = wallsGenerator.determineWallTiles(this.buildInnerWallsShortcuts(), this.buildSpotTilesShortcuts(), 12);
            this.assertEqual(result[0], 24);
            this.assertEqual(result[1], 25);
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

    async testCreateLayerInnerWalls()
    {
        await this.test('createLayerInnerWalls places inner wall tiles below a top-left border tile', async () => {
            let wallsGenerator = new WallsGenerator(this.buildWallsGenerator(this.buildInnerWallsShortcuts()));
            let spot = this.buildSpotTilesShortcuts();
            let bordersLayer = Array(16).fill(0);
            bordersLayer[0] = 10;
            let result = wallsGenerator.createLayerInnerWalls(bordersLayer, 'p', spot, 4, 4);
            this.assertEqual(result[4], 20);
            this.assertEqual(result[8], 21);
        });
    }

    async testFixInnerWallsPatternsGuard()
    {
        await this.test('fixInnerWallsPatterns returns nothing for an invalid layer', async () => {
            let wallsGenerator = new WallsGenerator(this.buildWallsGenerator({}));
            let result = wallsGenerator.fixInnerWallsPatterns([], {}, 4, 2);
            this.assert(!result, 'Expected no return for invalid layer');
        });
    }

    async testFixInnerWallsPatternsReplacesSequence()
    {
        await this.test('fixInnerWallsPatterns replaces an inner-wall sequence in place', async () => {
            let wallsGenerator = new WallsGenerator(this.buildWallsGenerator({}));
            let shortcuts = {sML: 20, sMC: 22, sMR: 24, cTR: 25, cTL: 21, sTC: 23};
            let layerData = [22, 0, 0, 0, 0, 0, 0, 0];
            let result = wallsGenerator.fixInnerWallsPatterns(layerData, shortcuts, 4, 2);
            this.assertEqual(result[0], 20);
            this.assertEqual(result[1], 0);
        });
    }

    async testCreateLayerOuterWallsReturnsLayers()
    {
        await this.test('createLayerOuterWalls returns outer and borders layers with placed tiles', async () => {
            let spotTiles = this.buildFullSpotTiles();
            let wallsGenerator = new WallsGenerator(this.buildWallsGenerator(this.buildOuterTiles()));
            let bordersLayer = Array(64).fill(0);
            bordersLayer[27] = spotTiles.sML;
            let wallsLayer = Array(64).fill(0);
            let result = await wallsGenerator.createLayerOuterWalls(bordersLayer, 'p', spotTiles, 8, 8, wallsLayer);
            this.assert(result, 'Expected a result object');
            this.assertEqual(result.outerWallsLayer.length, 64);
            this.assertEqual(result.bordersLayer.length, 64);
            let combined = result.outerWallsLayer.concat(result.bordersLayer);
            this.assert(combined.some(tile => 0 !== tile), 'Expected non-empty wall output');
        });
    }

    async testCreateLayerOuterWallsEmptyBorders()
    {
        await this.test('createLayerOuterWalls returns empty layers for an empty borders layer', async () => {
            let spotTiles = this.buildFullSpotTiles();
            let wallsGenerator = new WallsGenerator(this.buildWallsGenerator(this.buildOuterTiles()));
            let bordersLayer = Array(64).fill(0);
            let wallsLayer = Array(64).fill(0);
            let result = await wallsGenerator.createLayerOuterWalls(bordersLayer, 'p', spotTiles, 8, 8, wallsLayer);
            this.assertEqual(result.outerWallsLayer.length, 64);
            this.assertEqual(result.outerWallsLayer.every(tile => 0 === tile), true);
            this.assertEqual(result.bordersLayer.every(tile => 0 === tile), true);
        });
    }

}

module.exports.TestWallsGenerator = TestWallsGenerator;
