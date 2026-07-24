/**
 *
 * Reldens - Test Spot Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotGenerator } = require('../lib/generator/spot-generator');

class TestSpotGenerator extends BaseMapGeneratorTest
{

    buildSpotGenerator(groundSpots)
    {
        return new SpotGenerator({}, {}, {}, {}, {}, {}, {
            groundSpots: groundSpots ? groundSpots : {},
            groundSpotsPropertiesMappers: {},
            groundTile: 116,
            pathTile: 121,
            pathSize: 1,
            elementsVariations: {}
        });
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected method and fields', async () => {
            let spotGenerator = this.buildSpotGenerator();
            this.assert(spotGenerator instanceof SpotGenerator, 'Expected SpotGenerator instance');
            this.assert('function' === typeof spotGenerator.generateSpots, 'Expected generateSpots method');
            this.assertEqual(spotGenerator.groundTile, 116);
            this.assertEqual(spotGenerator.pathTile, 121);
        });
    }

    async testGenerateSpotsWithoutSpotsReturnsPassThrough()
    {
        await this.test('generateSpots returns passed-through data when no ground spots', async () => {
            let spotGenerator = this.buildSpotGenerator({});
            let layerElements = {tree: []};
            let elementsQuantity = {tree: 1};
            let result = await spotGenerator.generateSpots(
                {},
                {},
                layerElements,
                elementsQuantity,
                {},
                {},
                {}
            );
            this.assertDeepEqual(result.generatedSpots, {});
            this.assertDeepEqual(result.generateSpotsWithDepth, {});
            this.assertEqual(result.layerElements, layerElements);
            this.assertEqual(result.elementsQuantity, elementsQuantity);
        });
    }

}

module.exports.TestSpotGenerator = TestSpotGenerator;
