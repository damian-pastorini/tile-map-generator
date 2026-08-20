/**
 *
 * Reldens - Test Dungeon Generation Expected Maps
 *
 * Real-map proving test for the dungeon generation with walls. The case generates a complete dungeon from the
 * committed real composite files (map-composite-data-dungeon.json and reldens-dungeon-composite.json, whose
 * wangsets define the real cave wall tiles) under a fixed seed, and compares the full result against a
 * committed deterministic expected map file under tests/test-data (materialized on first run, then
 * committed). The case proves the exact inner and outer walls tile counts, so the cave rooms, paths and walls
 * can be verified visually by opening the expected map in Tiled. The town tileset has no wall tiles, which is
 * why the walls proving happens on the dungeon composite.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');
const { MultipleByLoaderGenerator } = require('../lib/generator/multiple-by-loader-generator');
const { TerrainsValidator } = require('../lib/validator/terrains-validator');
const { TileCountingUtility } = require('../lib/map/tile-counting-utility');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TestDungeonGenerationExpectedMaps extends BaseExpectedMapTest
{

    constructor()
    {
        super();
        this.terrainsValidator = new TerrainsValidator();
        this.dungeonGeneration = false;
    }

    buildDungeonLoaderGenerator()
    {
        let mapData = FileHandler.fetchFileJson(
            FileHandler.joinPaths(this.testDataFolder, 'map-composite-data-dungeon.json')
        );
        mapData.mapNames = ['dungeon-walls'];
        mapData.factor = 1;
        return new MultipleByLoaderGenerator({
            loaderData: {
                rootFolder: this.testDataFolder,
                generatedFolder: FileHandler.joinPaths(this.testDataFolder, 'generated'),
                mapData
            }
        });
    }

    async fetchDungeonGeneration()
    {
        if(this.dungeonGeneration){
            return this.dungeonGeneration;
        }
        let loaderGenerator = this.buildDungeonLoaderGenerator();
        this.currentSeed = 77777;
        Math.random = this.seedRandom(77777);
        try {
            await loaderGenerator.generate();
        } finally {
            this.restoreMathRandom();
        }
        this.dungeonGeneration = {
            map: loaderGenerator.generatedMaps['dungeon-walls'],
            generator: loaderGenerator.generators['dungeon-walls']
        };
        return this.dungeonGeneration;
    }

    async testDungeonWithCaveWallsMatchesCommittedExpectedMap()
    {
        await this.test('the dungeon composite generates the cave rooms with real walls on the expected map', async () => {
            let map = (await this.fetchDungeonGeneration()).map;
            this.assertValidMapStructure(map);
            let copied = FileHandler.copyFile(
                FileHandler.joinPaths(this.testDataFolder, 'generated', 'dungeon-walls.png'),
                FileHandler.joinPaths(this.testDataFolder, 'dungeon-walls.png')
            );
            this.assert(copied, 'The dungeon tileset image must be copied next to the expected map');
            let expected = this.loadOrCreateExpectedMap('dungeon-walls-expected.json', map);
            this.compareMapOutputs(expected, map);
            let layerNames = map.layers.map(layer => layer.name);
            Logger.log(100, '', 'Dungeon layers: '+sc.toJsonString(layerNames));
            let innerWallsLayer = map.layers.find(layer => -1 !== layer.name.indexOf('inner-walls'));
            let outerWallsLayer = map.layers.find(layer => -1 !== layer.name.indexOf('outer-walls'));
            this.assert(innerWallsLayer, 'The dungeon must contain an inner walls layer');
            this.assert(outerWallsLayer, 'The dungeon must contain an outer walls layer');
            Logger.log(100, '', 'Dungeon walls counts: '
                +TileCountingUtility.countNonZeroTiles(innerWallsLayer.data)
                +'/'
                +TileCountingUtility.countNonZeroTiles(outerWallsLayer.data));
            this.assertSpotVariationsRenderBelowWalls(map);
        });
    }

    async testDungeonTerrainsMatchTheResolvedCaveSpotsTiles()
    {
        await this.test('the dungeon terrains include every cave spot tile resolved for the generated map', async () => {
            let generation = await this.fetchDungeonGeneration();
            let terrains = sc.get(this.terrainsValidator.fetchMapTileset(generation.map), 'wangsets', []);
            let terrainNames = terrains.map(terrain => terrain.name);
            for(let terrainName of ['cave', 'cave-inner-walls', 'cave-outer-walls']){
                this.assert(
                    -1 !== terrainNames.indexOf(terrainName),
                    'The dungeon must include the terrain "'+terrainName+'", found: '+terrainNames.join(', ')
                );
            }
            let validation = this.terrainsValidator.validateTerrainsMatchResolvedTiles(
                generation.map,
                generation.generator.spotsTerrains
            );
            this.logFunctionalityResult('Dungeon Terrains Match Resolved Tiles', validation);
            this.assert(
                validation.isValid,
                'Every terrain tile must be the tile resolved for the spot position - '
                +sc.toJsonString(validation.violations)
            );
            this.assert(0 < validation.checkedPositions, 'The terrains tiles positions must be verified');
            Logger.log(100, '', 'Dungeon terrains: '+terrainNames.join(', ')
                +' - verified positions: '+validation.checkedPositions);
        });
    }

    async testDungeonTerrainsMatchTheCompositeSourceTerrains()
    {
        await this.test('the dungeon terrains match the composite source terrains and are used in the map', async () => {
            let generation = await this.fetchDungeonGeneration();
            let sourceValidation = this.terrainsValidator.validateTerrainsMatchSourceTerrains(
                generation.map,
                generation.generator.optimizedMapFirstTileset
            );
            this.logFunctionalityResult('Dungeon Terrains Match Source Terrains', sourceValidation);
            this.assertEqual(
                sourceValidation.matchedTerrains,
                3,
                'The three cave terrains must be matched against the composite source terrains'
            );
            this.assert(
                sourceValidation.isValid,
                'Every terrain tile must match the composite source terrain tile - '
                +sc.toJsonString(sourceValidation.violations)
            );
            let presentValidation = this.terrainsValidator.validateTerrainsTilesArePresentInMap(generation.map);
            this.logFunctionalityResult('Dungeon Terrains Tiles Present In Map', presentValidation);
            this.assert(
                presentValidation.isValid,
                'Every terrain must have its tiles present in the generated map - '
                +sc.toJsonString(presentValidation.violations)
            );
            this.assertEqual(
                presentValidation.presentTerrains,
                presentValidation.totalTerrains,
                'Every generated terrain must be used in the generated map'
            );
        });
    }

    async testDungeonTerrainsMatchCommittedExpectedTerrains()
    {
        await this.test('the dungeon terrains match the committed expected terrains file', async () => {
            let generation = await this.fetchDungeonGeneration();
            let terrains = sc.get(this.terrainsValidator.fetchMapTileset(generation.map), 'wangsets', []);
            let expectedTerrains = this.loadOrCreateExpectedTerrains(
                'dungeon-walls-terrains-expected.json',
                terrains
            );
            this.assertDeepEqual(
                terrains,
                expectedTerrains,
                'The dungeon terrains must match the committed expected terrains - got: '+sc.toJsonString(terrains)
            );
        });
    }

    assertSpotVariationsRenderBelowWalls(map)
    {
        let variationsLayers = map.layers.filter(layer => -1 !== layer.name.indexOf('-spot-variations'));
        this.assert(0 < variationsLayers.length, 'The dungeon must contain spot variations layers to prove the order');
        for(let variationsLayer of variationsLayers){
            this.assertSingleSpotVariationsBelowWalls(map, variationsLayer);
        }
    }

    assertSingleSpotVariationsBelowWalls(map, variationsLayer)
    {
        let instancePrefix = variationsLayer.name.replace('-spot-variations', '');
        let variationsIndex = map.layers.indexOf(variationsLayer);
        let wallLayers = map.layers.filter(layer => this.isSpotWallLayer(layer.name, instancePrefix));
        this.assert(0 < wallLayers.length, 'Spot "'+instancePrefix+'" must have wall layers to prove the order');
        for(let wallLayer of wallLayers){
            this.assert(
                variationsIndex < map.layers.indexOf(wallLayer),
                'Spot variations "'+variationsLayer.name+'" must render below wall layer "'+wallLayer.name+'"'
            );
        }
    }

    isSpotWallLayer(layerName, instancePrefix)
    {
        if(0 !== layerName.indexOf(instancePrefix)){
            return false;
        }
        if(-1 !== layerName.indexOf('inner-walls')){
            return true;
        }
        if(-1 !== layerName.indexOf('outer-walls')){
            return true;
        }
        return -1 !== layerName.indexOf('-borders');
    }

}

module.exports.TestDungeonGenerationExpectedMaps = TestDungeonGenerationExpectedMaps;
