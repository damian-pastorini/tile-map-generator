/**
 *
 * Reldens - Test Element Deleter
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { ElementDeleter } = require('../lib/map/element-deleter');

class TestElementDeleter extends BaseMapGeneratorTest
{

    buildMultiLayerMap()
    {
        return ElementFixtures.buildMap(
            [
                ElementFixtures.buildLayer('house-001-base', [10, 11, 0, 0]),
                ElementFixtures.buildLayer('house-001-walls', [20, 21, 0, 0])
            ],
            2,
            2
        );
    }

    buildMultiLayerElements()
    {
        return {
            elements: [ElementFixtures.buildElement('house-001', 'house', 1,
                {col: 0, row: 0, width: 2, height: 1},
                [
                    ElementFixtures.buildElementLayer('house-001-base', 'base', [
                        {col: 0, row: 0, gid: 10},
                        {col: 1, row: 0, gid: 11}
                    ]),
                    ElementFixtures.buildElementLayer('house-001-walls', 'walls', [
                        {col: 0, row: 0, gid: 20},
                        {col: 1, row: 0, gid: 21}
                    ])
                ]
            )]
        };
    }

    async testDeleteExistingElement()
    {
        await this.test('Delete existing element clears tiles and removes entry', async () => {
            let mapJson = ElementFixtures.buildSingleTileTreeMap();
            let mapElements = ElementFixtures.buildSingleTileTreeElements();
            let result = new ElementDeleter().delete(mapJson, mapElements, 'tree-001');
            this.assert(result.success);
            this.assertEqual(mapJson.layers[0].data[5], 0, 'Tile should be cleared');
            this.assertEqual(mapElements.elements.length, 0, 'Element entry should be removed');
        });
    }

    async testDeleteNonExistentElement()
    {
        await this.test('Delete non-existent element returns elementNotFound', async () => {
            let result = new ElementDeleter().delete(ElementFixtures.buildMap([]), {elements: []}, 'no-such');
            this.assert(!result.success);
            this.assertEqual(result.error, 'elementNotFound');
        });
    }

    async testDeleteSkipsLayerMissingFromMap()
    {
        await this.test('Delete skips element layers absent from the map and still removes the entry', async () => {
            let mapJson = ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', [1, 1, 1, 1])
            ], 2, 2);
            let mapElements = {
                elements: [ElementFixtures.buildElement('tree-001', 'tree', 1,
                    {col: 0, row: 0, width: 1, height: 1},
                    [ElementFixtures.buildElementLayer('tree-001-ghost', 'below-player', [{col: 0, row: 0, gid: 100}])]
                )]
            };
            let result = new ElementDeleter().delete(mapJson, mapElements, 'tree-001');
            this.assert(result.success, 'Delete should succeed even when the layer is missing');
            this.assertDeepEqual(mapJson.layers[0].data, [1, 1, 1, 1], 'Unrelated map layer is untouched');
            this.assertEqual(mapElements.elements.length, 0, 'Element entry should be removed');
        });
    }

    async testDeleteMultiLayerElement()
    {
        await this.test('Multi-layer element fully cleared', async () => {
            let mapJson = this.buildMultiLayerMap();
            let mapElements = this.buildMultiLayerElements();
            let result = new ElementDeleter().delete(mapJson, mapElements, 'house-001');
            this.assert(result.success);
            this.assertEqual(mapJson.layers[0].data[0], 0);
            this.assertEqual(mapJson.layers[0].data[1], 0);
            this.assertEqual(mapJson.layers[1].data[0], 0);
            this.assertEqual(mapJson.layers[1].data[1], 0);
            this.assertEqual(mapElements.elements.length, 0);
        });
    }
}

module.exports.TestElementDeleter = TestElementDeleter;
