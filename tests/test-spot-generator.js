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

    buildSpotGeneratorWithTiles(generatorOverrides)
    {
        let generatorData = {
            groundSpots: {},
            groundSpotsPropertiesMappers: {},
            groundTile: 116,
            pathTile: 121,
            pathSize: 1,
            elementsVariations: {},
            surroundingTiles: {},
            corners: {}
        };
        for(let overrideKey of Object.keys(generatorOverrides)){
            generatorData[overrideKey] = generatorOverrides[overrideKey];
        }
        return new SpotGenerator({}, {}, {}, {}, {}, {}, generatorData);
    }

    async testSpotPropertiesMapperIsBuiltFromConfiguredTiles()
    {
        await this.test('a spot with no properties mapper and no wangset resolves from the configured tiles', async () => {
            let spotGenerator = this.buildSpotGeneratorWithTiles({
                surroundingTiles: {'-1,0': 124, '0,-1': 126, '0,1': 129},
                corners: {'-1,-1': 285, '-1,1': 284}
            });
            let propertiesMapper = spotGenerator.fetchSpotPropertiesMapper('cave', {});
            this.assert(propertiesMapper, 'A properties mapper must be built from the configured tiles');
            this.assertEqual(propertiesMapper.surroundingTilesPosition['cave-top-center'], 124);
            this.assertEqual(propertiesMapper.surroundingTilesPosition['cave-middle-left'], 126);
            this.assertEqual(propertiesMapper.cornersPosition['cave-top-left'], 285);
            this.assertEqual(
                spotGenerator.groundSpotsPropertiesMappers.cave,
                propertiesMapper,
                'The built mapper must be cached by tiles key'
            );
        });
    }

    async testSpotPropertiesMapperIsNullWithoutAnySource()
    {
        await this.test('a spot with no tiles source at all resolves to no properties mapper', async () => {
            let spotGenerator = this.buildSpotGeneratorWithTiles({});
            this.assertEqual(
                spotGenerator.fetchSpotPropertiesMapper('cave', {}),
                null,
                'Nothing configured must resolve to null instead of an empty mapper'
            );
        });
    }

    async testSpotPropertiesMapperPrefersTheWangset()
    {
        await this.test('a spot with a wangset keeps using the wangset instead of the configured tiles', async () => {
            let spotGenerator = this.buildSpotGeneratorWithTiles({
                surroundingTiles: {'-1,0': 124},
                corners: {'-1,-1': 285},
                optimizedMapFirstTileset: {firstgid: 1, tiles: [], wangsets: [{name: 'cave', wangtiles: []}]}
            });
            this.assertEqual(
                spotGenerator.fetchSpotPropertiesMapper('cave', {}),
                null,
                'The wangset must win over the configured tiles'
            );
            this.assertEqual(
                Object.keys(spotGenerator.groundSpotsPropertiesMappers).length,
                0,
                'No mapper must be cached when a wangset exists'
            );
        });
    }

    async testSpotLevelTilesOverrideTheMapLevelTiles()
    {
        await this.test('the spot configured tiles take precedence over the map level tiles', async () => {
            let spotGenerator = this.buildSpotGeneratorWithTiles({
                surroundingTiles: {'-1,0': 124},
                corners: {'-1,-1': 285}
            });
            let propertiesMapper = spotGenerator.fetchSpotPropertiesMapper('cave', {
                surroundingTiles: {'-1,0': 500},
                corners: {'-1,-1': 501}
            });
            this.assertEqual(propertiesMapper.surroundingTilesPosition['cave-top-center'], 500);
            this.assertEqual(propertiesMapper.cornersPosition['cave-top-left'], 501);
        });
    }

    async testExistingSpotPropertiesMapperIsReused()
    {
        await this.test('an existing tiles properties mapper is reused and mapped', async () => {
            let mappedCalls = {count: 0};
            let existingMapper = {
                map: () => {
                    mappedCalls.count++;
                }
            };
            let spotGenerator = this.buildSpotGeneratorWithTiles({
                groundSpotsPropertiesMappers: {cave: existingMapper}
            });
            this.assertEqual(spotGenerator.fetchSpotPropertiesMapper('cave', {}), existingMapper);
            this.assertEqual(mappedCalls.count, 1, 'The existing mapper must be mapped once');
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
                {
                    layerElements,
                    elementsQuantity,
                    elementsFreeSpaceAround: {},
                    elementsAllowPathsInFreeSpace: {},
                    mapCenteredElements: {}
                }
            );
            this.assertDeepEqual(result.generatedSpots, {});
            this.assertDeepEqual(result.generateSpotsWithDepth, {});
            this.assertEqual(result.layerElements, layerElements);
            this.assertEqual(result.elementsQuantity, elementsQuantity);
        });
    }

}

module.exports.TestSpotGenerator = TestSpotGenerator;
