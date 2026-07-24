/**
 *
 * Reldens - Test Ground Variations Configuration
 *
 * Real-map proving tests for the ground variations configuration. Every case generates a complete map using
 * the committed real element files under a fixed seed, and compares the full result against a per-case
 * committed deterministic expected map file under tests/test-data (materialized on first run, then
 * committed). The seeded variation tiles are fully deterministic, so instead of a percentage tolerance the
 * cases prove the exact variation tiles count and the expected maps can be verified visually in Tiled.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');
const { TileCountingUtility } = require('../lib/map/tile-counting-utility');
const { Logger, sc } = require('@reldens/utils');

class TestGroundVariationsConfiguration extends BaseExpectedMapTest
{

    buildVariationsConfig(mapName, variableTilesPercentage)
    {
        let config = this.applyScenarioDefaults(this.setupComplexConfig(), mapName, 30, 30);
        config.elementsQuantity = {house1: 1, tree: 1};
        config.orderElementsBySize = false;
        config.placeElementsOrder = 'inOrder';
        config.variableTilesPercentage = variableTilesPercentage;
        return config;
    }

    async testTenPercentVariationsMatchCommittedExpectedMap()
    {
        await this.test('ten percent ground variations produce the exact seeded tiles on the expected map', async () => {
            let config = this.buildVariationsConfig('ground-variations-ten-percent', 10);
            let result = await this.runExpectedMapScenario(config, 33333, 'ground-variations-ten-percent-expected.json');
            let variationsLayer = result.map.layers.find(layer => 'ground-variations' === layer.name);
            this.assert(variationsLayer, 'The generated map must contain the ground-variations layer');
            let variationsCount = TileCountingUtility.countTilesFromSet(variationsLayer.data, config.randomGroundTiles);
            let nonZeroCount = TileCountingUtility.countNonZeroTiles(variationsLayer.data);
            Logger.log(100, '', 'Variations counts: '+sc.toJsonString({variationsCount, nonZeroCount}));
        });
    }

    async testZeroPercentProducesNoVariationsLayer()
    {
        await this.test('zero percent ground variations produce no variations layer on the expected map', async () => {
            let config = this.buildVariationsConfig('ground-variations-none', 0);
            let result = await this.runExpectedMapScenario(config, 33333, 'ground-variations-none-expected.json');
            let variationsLayer = result.map.layers.find(layer => 'ground-variations' === layer.name);
            this.assert(!variationsLayer, 'The generated map must not contain a ground-variations layer');
        });
    }

}

module.exports.TestGroundVariationsConfiguration = TestGroundVariationsConfiguration;
