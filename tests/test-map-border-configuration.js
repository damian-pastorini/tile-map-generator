/**
 *
 * Reldens - Test Map Border Configuration
 *
 * Real-map proving tests for the map border configuration. Every case generates a complete map using the
 * committed real element files under a fixed seed, and compares the full result against a per-case committed
 * deterministic expected map file under tests/test-data (materialized on first run, then committed). The
 * cases prove the exact border tiles per side and corner (bordersTiles) and the exact entry position gap
 * (entryPosition and entryPositionSize), so both can be verified visually by opening the expected map in
 * Tiled.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');

class TestMapBorderConfiguration extends BaseExpectedMapTest
{

    buildBorderConfig(mapName, overrides)
    {
        let config = this.applyScenarioDefaults(this.setupBasicConfig(), mapName, 30, 30);
        config.placeElementsOrder = 'inOrder';
        config.orderElementsBySize = false;
        return Object.assign(config, overrides);
    }

    async testCustomBorderTilesMatchCommittedExpectedMap()
    {
        await this.test('bordersTiles per side and corner land on the exact border indexes of the expected map', async () => {
            let config = this.buildBorderConfig('map-border-custom-tiles', {
                bordersTiles: {
                    'top': 124,
                    'right': 129,
                    'bottom': 131,
                    'left': 126,
                    'top-left': 127,
                    'top-right': 130,
                    'bottom-left': 132,
                    'bottom-right': 133
                }
            });
            let result = await this.runExpectedMapScenario(config, 44444, 'map-border-custom-tiles-expected.json');
            let borderLayer = result.map.layers.find(layer => 'collisions-map-border' === layer.name);
            this.assert(borderLayer, 'The generated map must contain the collisions-map-border layer');
            this.assertEqual(borderLayer.data[0], 127, 'Top-left corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[29], 130, 'Top-right corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[870], 132, 'Bottom-left corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[899], 133, 'Bottom-right corner must use the configured corner tile');
            this.assertEqual(borderLayer.data[1], 124, 'Top edge must use the configured top tile');
            this.assertEqual(borderLayer.data[30], 126, 'Left edge must use the configured left tile');
            this.assertEqual(borderLayer.data[59], 129, 'Right edge must use the configured right tile');
            this.assertEqual(borderLayer.data[871], 131, 'Bottom edge must use the configured bottom tile');
        });
    }

    async testEntryPositionOpensExactGapOnCommittedExpectedMap()
    {
        await this.test('entryPosition down-middle with size four opens the exact border gap on the expected map', async () => {
            let config = this.buildBorderConfig('map-border-entry-position', {
                entryPosition: 'down-middle',
                entryPositionSize: 4
            });
            let result = await this.runExpectedMapScenario(config, 44444, 'map-border-entry-position-expected.json');
            let borderLayer = result.map.layers.find(layer => 'collisions-map-border' === layer.name);
            this.assert(borderLayer, 'The generated map must contain the collisions-map-border layer');
            this.assertEqual(borderLayer.data[883], 0, 'The entry gap first tile must clear the border');
            this.assertEqual(borderLayer.data[884], 0, 'The entry gap second tile must clear the border');
            this.assertEqual(borderLayer.data[885], 0, 'The entry gap third tile must clear the border');
            this.assertEqual(borderLayer.data[886], 0, 'The entry gap fourth tile must clear the border');
            this.assertEqual(borderLayer.data[882], 116, 'The border must continue before the entry gap');
            this.assertEqual(borderLayer.data[887], 116, 'The border must continue after the entry gap');
            let changePointsLayer = result.map.layers.find(
                layer => 'return-to-main-map-change-points' === layer.name
            );
            this.assert(changePointsLayer, 'The entry position must record the return to main map layer');
            this.assertEqual(changePointsLayer.data[883], 116, 'The entry gap must hold the change point tiles');
            this.assertEqual(changePointsLayer.data[886], 116, 'The entry gap must hold the change point tiles end');
        });
    }

}

module.exports.TestMapBorderConfiguration = TestMapBorderConfiguration;
