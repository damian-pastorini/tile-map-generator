/**
 *
 * Reldens - Test Map Data Schema
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapDataSchema } = require('../lib/schemas/map-data-schema');

class TestMapDataSchema extends BaseMapGeneratorTest
{

    async testScalarFieldTypes()
    {
        let schema = MapDataSchema;
        await this.test('scalar dimension fields declare integer types', async () => {
            this.assertEqual(schema.tileSize.type, 'int', 'tileSize is int');
            this.assertEqual(schema.imageHeight.type, 'int', 'imageHeight is int');
            this.assertEqual(schema.imageWidth.type, 'int', 'imageWidth is int');
            this.assertEqual(schema.tileCount.type, 'int', 'tileCount is int');
            this.assertEqual(schema.columns.type, 'int', 'columns is int');
        });
        await this.test('string and boolean fields declare proper types', async () => {
            this.assertEqual(schema.tileSheetPath.type, 'string', 'tileSheetPath is string');
            this.assertEqual(schema.tileSheetName.type, 'string', 'tileSheetName is string');
            this.assertEqual(schema.blockMapBorder.type, 'boolean', 'blockMapBorder is boolean');
            this.assertEqual(schema.variableTilesPercentage.type, 'number', 'variableTilesPercentage is number');
        });
    }

    async testArrayFields()
    {
        let schema = MapDataSchema;
        await this.test('collisionLayersForPaths is a string-valued array', async () => {
            this.assertEqual(schema.collisionLayersForPaths.type, 'array', 'type is array');
            this.assertEqual(schema.collisionLayersForPaths.valuesType, 'string', 'values are strings');
        });
        await this.test('randomGroundTiles is an int-valued array', async () => {
            this.assertEqual(schema.randomGroundTiles.type, 'array', 'type is array');
            this.assertEqual(schema.randomGroundTiles.valuesType, 'int', 'values are ints');
        });
    }

    async testNestedObjectFields()
    {
        let schema = MapDataSchema;
        await this.test('surroundingTiles declares eight nested integer positions', async () => {
            this.assertEqual(schema.surroundingTiles.type, 'object', 'surroundingTiles is object');
            this.assertEqual(Object.keys(schema.surroundingTiles.nested).length, 8, 'eight surrounding positions');
            this.assertEqual(schema.surroundingTiles.nested['-1,-1'].type, 'int', 'nested entries are ints');
        });
        await this.test('corners declares four nested integer positions', async () => {
            this.assertEqual(schema.corners.type, 'object', 'corners is object');
            this.assertEqual(Object.keys(schema.corners.nested).length, 4, 'four corner positions');
            this.assertEqual(schema.corners.nested['1,1'].type, 'int', 'corner entries are ints');
        });
    }

}

module.exports.TestMapDataSchema = TestMapDataSchema;
