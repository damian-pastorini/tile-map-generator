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

    buildSpotTilesShortcuts()
    {
        return {
            p: 5,
            originalMappedData: {surroundingTilesPosition: {}, cornersPosition: {}}
        };
    }

    appendTerrainsForLayers(spotLayers)
    {
        let terrainsResult = {spotsTerrains: {}};
        terrainsResult.appended = this.buildSpotGenerator().appendSpotTerrains(
            terrainsResult.spotsTerrains,
            'cave',
            {spotLayers},
            this.buildSpotTilesShortcuts(),
            116
        );
        return terrainsResult;
    }

    async testSpotTerrainsAreAppendedForPlacedSpots()
    {
        await this.test('the spot terrains are appended for the spots with generated layers', async () => {
            let terrainsResult = this.appendTerrainsForLayers({'cave-s0': []});
            this.assertEqual(terrainsResult.appended, true, 'The terrains should be appended');
            this.assertDeepEqual(
                terrainsResult.spotsTerrains.cave,
                {surroundingTilesPosition: {'middle-center': 116}, cornersPosition: {}},
                'The spot fill tile should be stored as the terrain center by tiles key'
            );
        });
    }

    async testSpotTerrainsAreNotAppendedForSpotsWithoutLayers()
    {
        await this.test('the spot terrains are not appended when the spot created no layers', async () => {
            let terrainsResult = this.appendTerrainsForLayers({});
            this.assertEqual(terrainsResult.appended, false, 'The terrains should not be appended');
            this.assertEqual(Object.keys(terrainsResult.spotsTerrains).length, 0, 'No terrain should be stored');
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
