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
const { TileCountingUtility } = require('../lib/map/tile-counting-utility');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TestDungeonGenerationExpectedMaps extends BaseExpectedMapTest
{

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

    async testDungeonWithCaveWallsMatchesCommittedExpectedMap()
    {
        await this.test('the dungeon composite generates the cave rooms with real walls on the expected map', async () => {
            let generator = this.buildDungeonLoaderGenerator();
            this.currentSeed = 77777;
            Math.random = this.seedRandom(77777);
            try {
                await generator.generate();
            } finally {
                this.restoreMathRandom();
            }
            let map = generator.generatedMaps['dungeon-walls'];
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
