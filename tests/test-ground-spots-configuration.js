/**
 *
 * Reldens - Test Ground Spots Configuration
 *
 * Real-map proving tests for the ground spots configuration. Every case generates a complete map with an
 * organic ground spot using the committed real element files under a fixed seed, and compares the full result
 * against a per-case committed deterministic expected map file under tests/test-data (materialized on first
 * run, then committed). The cases cover the spot depth options - no depth keeps the spot layer below the
 * ground layer, a layer name depth places the spot right above that layer (proven against both the ground
 * and the path layers), and a numeric depth beyond the layers count clamps the spot to the top - so each
 * rendering level can be verified visually by opening the expected map in Tiled. The town tileset provides no wall tiles, so walled spots are covered by the dungeon
 * composite tests instead.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');
const { TileCountingUtility } = require('../lib/map/tile-counting-utility');
const { Logger, sc } = require('@reldens/utils');

class TestGroundSpotsConfiguration extends BaseExpectedMapTest
{

    buildSpotScenarioConfig(mapName, spotOverrides)
    {
        let config = this.applyScenarioDefaults(this.setupBasicConfig(), mapName, 30, 30);
        config.placeElementsOrder = 'inOrder';
        config.orderElementsBySize = false;
        config.groundSpots = {'spot-zone': Object.assign({
            quantity: 1,
            width: 8,
            height: 6,
            walkable: true,
            layerName: 'ground-spot-zone',
            spotTile: 26,
            freeSpaceAround: 1
        }, spotOverrides)};
        return config;
    }

    buildOrganicSpotConfig(mapName, spotDepth)
    {
        let overrides = {markPercentage: 80};
        if(spotDepth){
            overrides.depth = spotDepth;
        }
        return this.buildSpotScenarioConfig(mapName, overrides);
    }

    async runSpotScenario(mapName, spotDepth, expectedFileName)
    {
        let config = this.buildOrganicSpotConfig(mapName, spotDepth);
        let result = await this.runExpectedMapScenario(config, 66666, expectedFileName);
        let spotLayerIndex = result.map.layers.findIndex(layer => -1 !== layer.name.indexOf('spot-zone'));
        this.assert(-1 !== spotLayerIndex, 'The generated map must contain the ground spot layer');
        let groundLayerIndex = result.map.layers.findIndex(layer => 'ground' === layer.name);
        let spotTilesCount = TileCountingUtility.countTilesInLayer(result.map.layers[spotLayerIndex].data, 26);
        Logger.log(100, '', 'Spot scenario '+mapName+': '+sc.toJsonString({
            layerNames: result.map.layers.map(layer => layer.name),
            spotLayerIndex,
            groundLayerIndex,
            spotTilesCount
        }));
        return {map: result.map, spotLayerIndex, groundLayerIndex};
    }

    async testSpotWithoutDepthStaysBelowTheGroundLayer()
    {
        await this.test('a spot without depth stays below the ground layer on the expected map', async () => {
            let scenario = await this.runSpotScenario(
                'ground-spots-depth-default',
                false,
                'ground-spots-depth-default-expected.json'
            );
            this.assert(
                scenario.spotLayerIndex < scenario.groundLayerIndex,
                'Without a depth the spot layer must stay below the ground layer'
            );
        });
    }

    async testSpotWithGroundDepthRendersAboveTheGroundLayer()
    {
        await this.test('a spot with the ground layer as depth renders right above it on the expected map', async () => {
            let scenario = await this.runSpotScenario(
                'ground-spots-depth-above-ground',
                'ground',
                'ground-spots-depth-above-ground-expected.json'
            );
            this.assertEqual(
                scenario.spotLayerIndex,
                scenario.groundLayerIndex + 1,
                'A ground layer depth must place the spot layer right above the ground layer'
            );
        });
    }

    async testSpotWithPathDepthRendersAboveThePathLayer()
    {
        await this.test('a spot with the path layer as depth renders right above it on the expected map', async () => {
            let scenario = await this.runSpotScenario(
                'ground-spots-depth-above-path',
                'path',
                'ground-spots-depth-above-path-expected.json'
            );
            let pathLayerIndex = scenario.map.layers.findIndex(layer => 'path' === layer.name);
            this.assertEqual(
                scenario.spotLayerIndex,
                pathLayerIndex + 1,
                'A path layer depth must place the spot layer right above the path layer'
            );
        });
    }

    async testSpotWithHighNumericDepthClampsToTheTopLayer()
    {
        await this.test('a spot with a numeric depth beyond the layers count clamps to the top of the expected map', async () => {
            let scenario = await this.runSpotScenario(
                'ground-spots-depth-top',
                99,
                'ground-spots-depth-top-expected.json'
            );
            this.assertEqual(
                scenario.spotLayerIndex,
                scenario.map.layers.length - 1,
                'A numeric depth beyond the layers count must clamp the spot layer to the top'
            );
        });
    }

    buildElementSpotConfig(mapName, withVariations)
    {
        let overrides = {markPercentage: 100, isElement: true, tilesKey: 'spot-zone'};
        if(withVariations){
            overrides.variableTilesPercentage = 25;
            overrides.spotTileVariations = [27, 28, 29];
        }
        let config = this.buildSpotScenarioConfig(mapName, overrides);
        config.mainPathSize = 0;
        config.generateElementsPath = false;
        return config;
    }

    findSpotGroundIndex(map)
    {
        return map.layers.findIndex(
            layer => -1 !== layer.name.indexOf('ground-spot-zone') && -1 === layer.name.indexOf('-spot-variations')
        );
    }

    async testElementSpotWithVariationsPlacesVariationsAboveTheSpotGround()
    {
        await this.test('an element spot with variations places its variations layer directly above the spot ground', async () => {
            let config = this.buildElementSpotConfig('ground-spots-variations-on', true);
            let result = await this.runExpectedMapScenario(config, 24680, 'ground-spots-variations-on-expected.json');
            let spotGroundIndex = this.findSpotGroundIndex(result.map);
            let variationsIndex = result.map.layers.findIndex(layer => -1 !== layer.name.indexOf('-spot-variations'));
            Logger.log(100, '', 'Variations-on layers: '+sc.toJsonString(result.map.layers.map(layer => layer.name)));
            this.assert(-1 !== spotGroundIndex, 'The element spot ground layer must exist');
            this.assert(-1 !== variationsIndex, 'The element spot variations layer must exist when variations are enabled');
            this.assertEqual(
                variationsIndex,
                spotGroundIndex + 1,
                'The variations layer must render directly above the spot ground layer'
            );
        });
    }

    async testElementSpotWithoutVariationsHasNoVariationsLayer()
    {
        await this.test('an element spot without variations produces no variations layer', async () => {
            let config = this.buildElementSpotConfig('ground-spots-variations-off', false);
            let result = await this.runExpectedMapScenario(config, 24680, 'ground-spots-variations-off-expected.json');
            let spotGroundIndex = this.findSpotGroundIndex(result.map);
            let variationsIndex = result.map.layers.findIndex(layer => -1 !== layer.name.indexOf('-spot-variations'));
            this.assert(-1 !== spotGroundIndex, 'The element spot ground layer must exist');
            this.assertEqual(variationsIndex, -1, 'No variations layer must exist when variations are disabled');
        });
    }

}

module.exports.TestGroundSpotsConfiguration = TestGroundSpotsConfiguration;
