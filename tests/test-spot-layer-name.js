/**
 *
 * Reldens - Test Spot Layer Name
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotLayerName } = require('../lib/map/spot-layer-name');

class TestSpotLayerName extends BaseMapGeneratorTest
{

    constructor()
    {
        super();
        this.spotLayerName = new SpotLayerName();
    }

    async testParseSimpleSpotInstance()
    {
        await this.test('parse reads the instance segment of a plain spot layer', async () => {
            let parsed = this.spotLayerName.parse('spot_grass-s0');
            this.assertEqual(parsed.instanceId, 'spot_grass-s0');
            this.assertEqual(parsed.base, 'spot_grass');
            this.assertEqual(parsed.index, 0);
            this.assertEqual(parsed.layerType, 'spot');
        });
    }

    async testParseKeepsCollisionsInsideTheBase()
    {
        await this.test('parse keeps a collisions segment inside the spot base', async () => {
            let parsed = this.spotLayerName.parse('spot_003_river_grass-collisions-s0');
            this.assertEqual(parsed.base, 'spot_003_river_grass-collisions');
            this.assertEqual(parsed.instanceId, 'spot_003_river_grass-collisions-s0');
            this.assertEqual(parsed.index, 0);
            this.assertEqual(parsed.layerType, 'spot');
        });
    }

    async testParseGroupsVariationsWithItsBase()
    {
        await this.test('parse gives the variations sub-layer the same instance id as its base', async () => {
            let base = this.spotLayerName.parse('spot_003_river_grass-collisions-s0');
            let variations = this.spotLayerName.parse('spot_003_river_grass-collisions-s0-spot-variations');
            this.assertEqual(variations.instanceId, base.instanceId);
            this.assertEqual(variations.layerType, 'spot-variations');
            this.assertEqual(variations.index, 0);
        });
    }

    async testParseSeparatesInstancesOfTheSameSpot()
    {
        await this.test('parse keeps different instances of the same spot apart', async () => {
            let first = this.spotLayerName.parse('spot_001_dark_grass-s0');
            let second = this.spotLayerName.parse('spot_001_dark_grass-s2');
            this.assert(first.instanceId !== second.instanceId, 'instances must not collide');
            this.assertEqual(second.index, 2);
        });
    }

    async testParseReadsMultiDigitInstances()
    {
        await this.test('parse reads multi digit instance numbers', async () => {
            let parsed = this.spotLayerName.parse('spot_001_dark_grass-s10');
            this.assertEqual(parsed.index, 10);
            this.assertEqual(parsed.instanceId, 'spot_001_dark_grass-s10');
        });
    }

    async testParseRejectsNonSpotNames()
    {
        await this.test('parse returns null for names without an instance segment', async () => {
            this.assertEqual(this.spotLayerName.parse('tree0-base'), null);
            this.assertEqual(this.spotLayerName.parse('ground'), null);
            this.assertEqual(this.spotLayerName.parse('spot_grass'), null);
            this.assertEqual(this.spotLayerName.parse('-s0'), null);
            this.assertEqual(this.spotLayerName.parse(null), null);
        });
    }

    async testGroupKeyDropsTheInstanceSegment()
    {
        await this.test('groupKey drops the instance segment so every instance shares one key', async () => {
            this.assertEqual(
                this.spotLayerName.groupKey('spot_003_river_grass-collisions-s0'),
                'spot_003_river_grass-collisions'
            );
            this.assertEqual(
                this.spotLayerName.groupKey('spot_003_river_grass-collisions-s1'),
                'spot_003_river_grass-collisions'
            );
        });
    }

    async testGroupKeyKeepsTheSubLayerSuffix()
    {
        await this.test('groupKey keeps the sub-layer suffix so variations merge apart from the base', async () => {
            this.assertEqual(
                this.spotLayerName.groupKey('spot_003_river_grass-collisions-s0-spot-variations'),
                'spot_003_river_grass-collisions-spot-variations'
            );
        });
    }

    async testGroupKeyRejectsNonSpotNames()
    {
        await this.test('groupKey returns null when there is no instance segment', async () => {
            this.assertEqual(this.spotLayerName.groupKey('ground'), null);
            this.assertEqual(this.spotLayerName.groupKey('tree0-base'), null);
        });
    }

}

module.exports.TestSpotLayerName = TestSpotLayerName;
