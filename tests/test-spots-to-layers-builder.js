/**
 *
 * Reldens - Test Spots To Layers Builder
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { SpotsToLayersBuilder } = require('../lib/map/spots-to-layers-builder');
const { SpotsFromLayersLoader } = require('../lib/loader/spots-from-layers-loader');

class TestSpotsToLayersBuilder extends BaseMapGeneratorTest
{

    buildSpotMap()
    {
        return ElementFixtures.buildMap([
            ElementFixtures.buildLayer('ground', ElementFixtures.gridWithTileAt(0, 0, 1)),
            ElementFixtures.buildLayer('spot_001_dark_grass-s0', ElementFixtures.gridWithTileAt(1, 1, 100)),
            ElementFixtures.buildLayer('tree-001-below-player', ElementFixtures.gridWithTileAt(3, 3, 300))
        ]);
    }

    buildSpotRecord(layerName, tiles)
    {
        return {spots: [{
            instanceId: 'spot_001_dark_grass-s0',
            elementKey: 'spot_001_dark_grass',
            index: 0,
            layers: [{name: layerName, type: 'spot', tiles}],
            bounds: {col: 2, row: 2, width: 1, height: 1}
        }]};
    }

    assertSpotLayerData(result, expectedData, message)
    {
        this.assertEqual(result.layers.length, 3, message+' - no layer added or dropped');
        this.assertDeepEqual(result.layers[1].data, expectedData, message);
    }

    async testReplacesSpotLayerDataAtNewPosition()
    {
        await this.test('Spot layer data is replaced at the new tile positions', async () => {
            let record = this.buildSpotRecord('spot_001_dark_grass-s0', [{col: 2, row: 2, gid: 100}]);
            let result = new SpotsToLayersBuilder().apply(this.buildSpotMap(), record);
            this.assertEqual(result.layers[1].name, 'spot_001_dark_grass-s0', 'Spot layer keeps its name');
            this.assertSpotLayerData(result, ElementFixtures.gridWithTileAt(2, 2, 100), 'Tile moved to row 2 col 2');
        });
    }

    async testLayerOrderAndUnlistedLayersUntouched()
    {
        await this.test('Layer order, names and unlisted layers stay untouched', async () => {
            let record = this.buildSpotRecord('spot_001_dark_grass-s0', [{col: 2, row: 2, gid: 100}]);
            let result = new SpotsToLayersBuilder().apply(this.buildSpotMap(), record);
            this.assertEqual(result.layers.length, 3, 'No layer added or dropped');
            this.assertEqual(result.layers[0].name, 'ground', 'Ground stays first');
            this.assertEqual(result.layers[1].name, 'spot_001_dark_grass-s0', 'Spot layer stays second');
            this.assertEqual(result.layers[2].name, 'tree-001-below-player', 'Element layer stays third');
            this.assertDeepEqual(result.layers[0].data, ElementFixtures.gridWithTileAt(0, 0, 1), 'Ground data untouched');
            this.assertDeepEqual(
                result.layers[2].data,
                ElementFixtures.gridWithTileAt(3, 3, 300),
                'Element layer data untouched'
            );
        });
    }

    async testUnknownLayerNameIsSkipped()
    {
        await this.test('Unknown spot layer name is skipped without touching the map', async () => {
            let record = this.buildSpotRecord('spot_002_river-collisions-s9', [{col: 2, row: 2, gid: 100}]);
            let result = new SpotsToLayersBuilder().apply(this.buildSpotMap(), record);
            this.assertSpotLayerData(result, ElementFixtures.gridWithTileAt(1, 1, 100), 'Existing spot layer untouched');
        });
    }

    async testUnlistedSpotsAreLeftInPlace()
    {
        await this.test('A partial record leaves the spots it does not list in place', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('spot_001_dark_grass-s0', ElementFixtures.gridWithTileAt(1, 1, 100)),
                ElementFixtures.buildLayer('spot_001_dark_grass-s1', ElementFixtures.gridWithTileAt(3, 3, 200))
            ]);
            let record = this.buildSpotRecord('spot_001_dark_grass-s0', [{col: 2, row: 2, gid: 100}]);
            let result = new SpotsToLayersBuilder().apply(mapJson, record);
            this.assertDeepEqual(result.layers[0].data, ElementFixtures.gridWithTileAt(2, 2, 100), 'Listed spot moved');
            this.assertDeepEqual(result.layers[1].data, ElementFixtures.gridWithTileAt(3, 3, 200), 'Unlisted spot kept');
        });
    }

    buildCollisionsSpotMap()
    {
        return ElementFixtures.buildMap([
            ElementFixtures.buildLayer('spot_003_river_grass-collisions-s0', ElementFixtures.gridWithTileAt(1, 1, 100)),
            ElementFixtures.buildLayer(
                'spot_003_river_grass-collisions-s0-spot-variations',
                ElementFixtures.gridWithTileAt(1, 1, 200)
            )
        ]);
    }

    buildCollisionsSpotLayers()
    {
        return [
            ElementFixtures.buildElementLayer(
                'spot_003_river_grass-collisions-s0',
                'spot',
                [{col: 2, row: 2, gid: 100}]
            ),
            ElementFixtures.buildElementLayer(
                'spot_003_river_grass-collisions-s0-spot-variations',
                'spot-variations',
                [{col: 2, row: 2, gid: 200}]
            )
        ];
    }

    buildCollisionsSpotRecord()
    {
        return {spots: [ElementFixtures.buildElement(
            'spot_003_river_grass-collisions-s0',
            'spot_003_river_grass-collisions',
            0,
            {col: 2, row: 2, width: 1, height: 1},
            this.buildCollisionsSpotLayers()
        )]};
    }

    async testSpotVariationsLayerIsRebuiltWithItsBase()
    {
        await this.test('A -spot-variations segment is rebuilt together with its -collisions base', async () => {
            let result = new SpotsToLayersBuilder().apply(
                this.buildCollisionsSpotMap(),
                this.buildCollisionsSpotRecord()
            );
            this.assertDeepEqual(result.layers[0].data, ElementFixtures.gridWithTileAt(2, 2, 100), 'Base moved');
            this.assertDeepEqual(result.layers[1].data, ElementFixtures.gridWithTileAt(2, 2, 200), 'Variations moved');
        });
    }

    async testApplyIsIdempotent()
    {
        await this.test('Re-applying an already applied record changes nothing', async () => {
            let mapJson = this.buildSpotMap();
            let record = this.buildSpotRecord('spot_001_dark_grass-s0', [{col: 2, row: 2, gid: 100}]);
            let builder = new SpotsToLayersBuilder();
            builder.apply(mapJson, record);
            let result = builder.apply(mapJson, record);
            this.assertSpotLayerData(result, ElementFixtures.gridWithTileAt(2, 2, 100), 'Second apply keeps the data');
        });
    }

    async testMissingSpotsReturnsMapUnchanged()
    {
        await this.test('Missing spots returns the map unchanged', async () => {
            let result = new SpotsToLayersBuilder().apply(this.buildSpotMap(), {});
            this.assertSpotLayerData(result, ElementFixtures.gridWithTileAt(1, 1, 100), 'Spot layer data unchanged');
        });
    }

    async testNullSpotsReturnsMapUnchanged()
    {
        await this.test('Null spot record returns the map unchanged', async () => {
            let result = new SpotsToLayersBuilder().apply(this.buildSpotMap(), null);
            this.assertSpotLayerData(result, ElementFixtures.gridWithTileAt(1, 1, 100), 'Spot layer data unchanged');
        });
    }

    async testEmptySpotsListKeepsMapUnchanged()
    {
        await this.test('Empty spots list keeps the map unchanged', async () => {
            let result = new SpotsToLayersBuilder().apply(this.buildSpotMap(), {spots: []});
            this.assertSpotLayerData(result, ElementFixtures.gridWithTileAt(1, 1, 100), 'Spot layer data unchanged');
        });
    }

    async testLoaderRecordRoundTripsWithoutChanges()
    {
        await this.test('An untouched loader record rebuilds the very same spot layers', async () => {
            let mapJson = this.buildSpotMap();
            let record = new SpotsFromLayersLoader().load(mapJson);
            let result = new SpotsToLayersBuilder().apply(mapJson, record);
            this.assertSpotLayerData(result, ElementFixtures.gridWithTileAt(1, 1, 100), 'Round trip keeps the layer');
        });
    }
}

module.exports.TestSpotsToLayersBuilder = TestSpotsToLayersBuilder;
