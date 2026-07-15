/**
 *
 * Reldens - Test Spots From Layers Loader
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { SpotsFromLayersLoader } = require('../lib/loader/spots-from-layers-loader');

class TestSpotsFromLayersLoader extends BaseMapGeneratorTest
{

    buildSpotMapWithVariations(baseName)
    {
        return ElementFixtures.buildMap([
            ElementFixtures.buildLayer(baseName, ElementFixtures.gridWithTileAt(1, 1, 100)),
            ElementFixtures.buildLayer(baseName+'-spot-variations', ElementFixtures.gridWithTileAt(2, 2, 200))
        ]);
    }

    async testSpotSegmentsGroupedUnderOneInstance()
    {
        await this.test('Spot base and spot-variations layers group under one instance id', async () => {
            let result = new SpotsFromLayersLoader().load(this.buildSpotMapWithVariations('spot_001_dark_grass-s0'));
            this.assertEqual(result.spots.length, 1, 'Expected one spot');
            this.assertEqual(result.spots[0].instanceId, 'spot_001_dark_grass-s0', 'Instance id keeps the -s0 segment');
            this.assertEqual(result.spots[0].elementKey, 'spot_001_dark_grass', 'Base key drops the -s0 segment');
            this.assertEqual(result.spots[0].index, 0, 'Instance index parsed from -s0');
            this.assertEqual(result.spots[0].layers.length, 2, 'Both segments grouped');
            this.assertEqual(result.spots[0].layers[0].type, 'spot', 'Base segment defaults to the spot type');
            this.assertEqual(result.spots[0].layers[1].type, 'spot-variations', 'Suffixed segment keeps its type');
        });
    }

    async testCollisionsBaseGroupsWithItsVariations()
    {
        await this.test('A base containing -collisions groups with its -spot-variations segment', async () => {
            let result = new SpotsFromLayersLoader().load(
                this.buildSpotMapWithVariations('spot_003_river_grass-collisions-s0')
            );
            this.assertEqual(result.spots.length, 1, 'Expected one spot');
            this.assertEqual(result.spots[0].instanceId, 'spot_003_river_grass-collisions-s0', 'Instance id');
            this.assertEqual(result.spots[0].elementKey, 'spot_003_river_grass-collisions', 'Base keeps -collisions');
            this.assertEqual(result.spots[0].index, 0, 'Instance index parsed from -s0');
            this.assertEqual(result.spots[0].layers.length, 2, 'Both segments grouped');
            this.assertEqual(result.spots[0].layers[0].type, 'spot', 'Base segment defaults to the spot type');
            this.assertEqual(result.spots[0].layers[1].type, 'spot-variations', 'Suffixed segment keeps its type');
        });
    }

    async testSeparateInstancesStaySeparate()
    {
        await this.test('Different -s{index} instances of the same spot stay separate', async () => {
            let result = new SpotsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('spot_001_dark_grass-s0', ElementFixtures.gridWithTileAt(0, 0, 100)),
                ElementFixtures.buildLayer('spot_001_dark_grass-s1', ElementFixtures.gridWithTileAt(3, 3, 200))
            ]));
            this.assertEqual(result.spots.length, 2, 'Expected two separate spot instances');
            this.assertEqual(result.spots[0].instanceId, 'spot_001_dark_grass-s0', 'First instance id');
            this.assertEqual(result.spots[1].instanceId, 'spot_001_dark_grass-s1', 'Second instance id');
        });
    }

    async testSpotBoundsSpanAllSegments()
    {
        await this.test('Spot bounds span the tiles of every segment', async () => {
            let result = new SpotsFromLayersLoader().load(this.buildSpotMapWithVariations('spot_001_dark_grass-s0'));
            this.assertEqual(result.spots[0].bounds.col, 1, 'Min col across segments');
            this.assertEqual(result.spots[0].bounds.row, 1, 'Min row across segments');
            this.assertEqual(result.spots[0].bounds.width, 2, 'Width spans cols 1..2');
            this.assertEqual(result.spots[0].bounds.height, 2, 'Height spans rows 1..2');
        });
    }

    async testSpotTilesCarryColRowGid()
    {
        await this.test('Spot tiles are extracted with col, row and gid', async () => {
            let result = new SpotsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('spot_grass-s0', ElementFixtures.gridWithTileAt(1, 1, 100))
            ]));
            this.assertEqual(result.spots[0].layers[0].name, 'spot_grass-s0', 'Layer name preserved');
            this.assertEqual(result.spots[0].layers[0].tiles.length, 1, 'One non-zero tile collected');
            this.assertEqual(result.spots[0].layers[0].tiles[0].col, 1, 'Tile col');
            this.assertEqual(result.spots[0].layers[0].tiles[0].row, 1, 'Tile row');
            this.assertEqual(result.spots[0].layers[0].tiles[0].gid, 100, 'Tile gid');
        });
    }

    async testElementLayersAreNotSpots()
    {
        await this.test('Element layers are never collected as spots', async () => {
            let result = new SpotsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('tree0-base', ElementFixtures.gridWithTileAt(0, 0, 100)),
                ElementFixtures.buildLayer('tree-001-below-player', ElementFixtures.gridWithTileAt(1, 1, 101)),
                ElementFixtures.buildLayer('tree-001-collisions', ElementFixtures.gridWithTileAt(2, 2, 102))
            ]));
            this.assertEqual(result.spots.length, 0, 'Element layers must not become spots');
            this.assert(-1 !== result.warnings.indexOf('no-spots-detected'), 'Expected no-spots-detected warning');
        });
    }

    async testReservedLayerNamesSkipped()
    {
        await this.test('Reserved and spot-layer prefixed names skipped', async () => {
            let result = new SpotsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', ElementFixtures.gridWithTileAt(0, 0, 1)),
                ElementFixtures.buildLayer('ground-variations', ElementFixtures.gridWithTileAt(0, 1, 2)),
                ElementFixtures.buildLayer('borders', ElementFixtures.gridWithTileAt(0, 2, 3)),
                ElementFixtures.buildLayer('change-points', ElementFixtures.gridWithTileAt(0, 3, 4)),
                ElementFixtures.buildLayer('spot-layer-water-s0', ElementFixtures.gridWithTileAt(1, 0, 5))
            ]));
            this.assertEqual(result.spots.length, 0, 'No reserved layer becomes a spot');
        });
    }

    async testLayerWithoutInstanceSegmentSkipped()
    {
        await this.test('Layer without a -s{index} segment is not a spot', async () => {
            let result = new SpotsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('some-static-layer', ElementFixtures.gridWithTileAt(0, 0, 100))
            ]));
            this.assertEqual(result.spots.length, 0, 'Static layer must not become a spot');
        });
    }

    async testNonTilelayerSkipped()
    {
        await this.test('Non-tilelayer types skipped', async () => {
            let result = new SpotsFromLayersLoader().load(ElementFixtures.buildMap([
                {type: 'objectgroup', name: 'spot_001-s0', objects: []}
            ]));
            this.assertEqual(result.spots.length, 0, 'Object groups must not become spots');
        });
    }

    async testEmptyLayersReturnsWarning()
    {
        await this.test('Empty layers returns no-layers warning', async () => {
            let result = new SpotsFromLayersLoader().load(ElementFixtures.buildMap([]));
            this.assertEqual(result.spots.length, 0, 'Expected empty spots');
            this.assert(-1 !== result.warnings.indexOf('no-layers'), 'Expected no-layers warning');
        });
    }

    async testMissingMapJsonReturnsWarning()
    {
        await this.test('Missing mapJson returns no-map-json warning', async () => {
            let result = new SpotsFromLayersLoader().load(null);
            this.assertEqual(result.spots.length, 0, 'Expected empty spots');
            this.assert(-1 !== result.warnings.indexOf('no-map-json'), 'Expected no-map-json warning');
        });
    }
}

module.exports.TestSpotsFromLayersLoader = TestSpotsFromLayersLoader;
