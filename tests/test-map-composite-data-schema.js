/**
 *
 * Reldens - Test Map Composite Data Schema
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapCompositeDataSchema } = require('../lib/schemas/map-composite-data-schema');

class TestMapCompositeDataSchema extends BaseMapGeneratorTest
{

    async testDeclaredFields()
    {
        let schema = MapCompositeDataSchema;
        await this.test('composite schema declares exactly the expected keys', async () => {
            let keys = Object.keys(schema);
            this.assertEqual(keys.length, 4, 'four composite fields declared');
            this.assert(schema.blockMapBorder, 'blockMapBorder present');
            this.assert(schema.freeSpaceTilesQuantity, 'freeSpaceTilesQuantity present');
            this.assert(schema.variableTilesPercentage, 'variableTilesPercentage present');
            this.assert(schema.collisionLayersForPaths, 'collisionLayersForPaths present');
        });
        await this.test('composite schema field types are correct', async () => {
            this.assertEqual(schema.blockMapBorder.type, 'boolean', 'blockMapBorder is boolean');
            this.assertEqual(schema.freeSpaceTilesQuantity.type, 'int', 'freeSpaceTilesQuantity is int');
            this.assertEqual(schema.variableTilesPercentage.type, 'number', 'variableTilesPercentage is number');
            this.assertEqual(schema.collisionLayersForPaths.type, 'array', 'collisionLayersForPaths is array');
            this.assertEqual(schema.collisionLayersForPaths.valuesType, 'string', 'collision values are strings');
        });
    }

}

module.exports.TestMapCompositeDataSchema = TestMapCompositeDataSchema;
