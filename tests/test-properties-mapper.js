/**
 *
 * Reldens - Test Properties Mapper
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PropertiesMapper } = require('../lib/generator/properties-mapper');

class TestPropertiesMapper extends BaseMapGeneratorTest
{

    async testPopulateWithSurroundingTiles()
    {
        await this.test('populateWithSurroundingTiles maps positions to keys', async () => {
            let mapper = new PropertiesMapper();
            mapper.populateWithSurroundingTiles({'-1,-1': 11, '0,1': 22});
            this.assertEqual(mapper.surroundingTilesPosition['top-left'], 11, 'Top left mapped');
            this.assertEqual(mapper.surroundingTilesPosition['middle-right'], 22, 'Middle right mapped');
        });
    }

    async testPopulateWithCornerTiles()
    {
        await this.test('populateWithCornerTiles maps corner positions', async () => {
            let mapper = new PropertiesMapper();
            mapper.populateWithCornerTiles({'-1,1': 33, '1,-1': 44});
            this.assertEqual(mapper.cornersPosition['top-right'], 33, 'Top right corner mapped');
            this.assertEqual(mapper.cornersPosition['bottom-left'], 44, 'Bottom left corner mapped');
        });
    }

    async testPrefixApplied()
    {
        await this.test('mapperPrefix prefixes the generated keys', async () => {
            let mapper = new PropertiesMapper('path');
            mapper.populateWithSurroundingTiles({'1,1': 99});
            this.assertEqual(mapper.surroundingTilesPosition['path-bottom-right'], 99, 'Prefixed key mapped');
        });
    }

    async testMapSurroundingByKey()
    {
        await this.test('mapSurroundingByKey resolves key to position', async () => {
            let mapper = new PropertiesMapper();
            mapper.mapSurroundingByKey('middle-left', 7);
            this.assertEqual(mapper.surroundingTiles['0,-1'], 7, 'Key resolved to position string');
        });
    }

    async testMapCornersByKey()
    {
        await this.test('mapCornersByKey resolves corner key to position', async () => {
            let mapper = new PropertiesMapper();
            mapper.mapCornersByKey('bottom-right', 8);
            this.assertEqual(mapper.corners['1,1'], 8, 'Corner key resolved to position string');
        });
    }

    async testMapPopulatesBothCollections()
    {
        await this.test('map populates surrounding and corner positions', async () => {
            let mapper = new PropertiesMapper();
            mapper.map({'-1,0': 5}, {'1,1': 6});
            this.assertEqual(mapper.surroundingTilesPosition['top-center'], 5, 'Surrounding populated');
            this.assertEqual(mapper.cornersPosition['bottom-right'], 6, 'Corners populated');
        });
    }

    async testReset()
    {
        await this.test('reset clears mapped collections', async () => {
            let mapper = new PropertiesMapper();
            mapper.populateWithSurroundingTiles({'-1,-1': 11});
            mapper.reset();
            this.assertEqual(Object.keys(mapper.surroundingTilesPosition).length, 0, 'Surrounding cleared');
            this.assertEqual(Object.keys(mapper.cornersPosition).length, 0, 'Corners cleared');
        });
    }

}

module.exports.TestPropertiesMapper = TestPropertiesMapper;
