/**
 *
 * Reldens - Test Json Formatter
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { JsonFormatter } = require('../lib/map/json-formatter');
const { sc } = require('@reldens/utils');

class TestJsonFormatter extends BaseMapGeneratorTest
{

    async testMapToJSONReturnsString()
    {
        let map = {type: 'map', width: 2, height: 1};
        await this.test('mapToJSON returns a parseable JSON string', async () => {
            let result = JsonFormatter.mapToJSON(map);
            this.assert('string' === typeof result, 'Result should be a string');
            let parsed = sc.parseJson(result);
            this.assertEqual(parsed.type, 'map', 'Parsed type should match');
            this.assertEqual(parsed.width, 2, 'Parsed width should match');
        });
    }

    async testMapToJSONCollapsesDataArrays()
    {
        let map = {layers: [{name: 'ground', data: [1, 2, 3, 4]}]};
        await this.test('mapToJSON collapses data arrays onto a single line', async () => {
            let result = JsonFormatter.mapToJSON(map);
            this.assert(0 <= result.indexOf('"data": [\n1,2,3,4\n'), 'Data array should be collapsed without whitespace');
        });
    }

    async testMapToJSONPreservesDataValues()
    {
        let map = {layers: [{name: 'path', data: [0, 10, 20]}]};
        await this.test('mapToJSON preserves data values after collapsing', async () => {
            let result = JsonFormatter.mapToJSON(map);
            let parsed = sc.parseJson(result);
            this.assertDeepEqual(parsed.layers[0].data, [0, 10, 20], 'Data values should be preserved');
        });
    }

    async testMapToJSONKeepsNonDataIndented()
    {
        let map = {type: 'map', width: 1};
        await this.test('mapToJSON keeps non-data structures pretty printed', async () => {
            let result = JsonFormatter.mapToJSON(map);
            this.assert(0 <= result.indexOf('\n    "type"'), 'Non-data keys should be indented with four spaces');
        });
    }

    async testMapToJSONHandlesEmptyData()
    {
        let map = {layers: [{name: 'empty', data: []}]};
        await this.test('mapToJSON handles empty data arrays', async () => {
            let result = JsonFormatter.mapToJSON(map);
            let parsed = sc.parseJson(result);
            this.assertDeepEqual(parsed.layers[0].data, [], 'Empty data should remain empty');
        });
    }

}

module.exports.TestJsonFormatter = TestJsonFormatter;
