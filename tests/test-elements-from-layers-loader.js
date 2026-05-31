/**
 *
 * Reldens - Test Elements From Layers Loader
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementFixtures } = require('./element-fixtures');
const { ElementsFromLayersLoader } = require('../lib/loader/elements-from-layers-loader');

class TestElementsFromLayersLoader extends BaseMapGeneratorTest
{

    async testLoadEmptyLayersReturnsWarning()
    {
        await this.test('Empty layers returns no-layers warning', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([]));
            this.assertEqual(result.elements.length, 0, 'Expected empty elements');
            this.assert(-1 !== result.warnings.indexOf('no-layers'), 'Expected no-layers warning');
            this.assertEqual(result.bordersLayer, 'borders', 'Default borders layer expected');
        });
    }

    async testLoadSingleElement()
    {
        await this.test('Single element layer parsed with bounds and tiles', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer(
                    'tree-001-below-player',
                    [0, 0, 0, 0, 0, 100, 101, 0, 0, 102, 103, 0, 0, 0, 0, 0]
                )
            ]));
            this.assertEqual(result.elements.length, 1, 'Expected one element');
            this.assertEqual(result.elements[0].instanceId, 'tree-001');
            this.assertEqual(result.elements[0].elementKey, 'tree');
            this.assertEqual(result.elements[0].index, 1);
            this.assertEqual(result.elements[0].layers.length, 1);
            this.assertEqual(result.elements[0].layers[0].type, 'below-player');
            this.assertEqual(result.elements[0].layers[0].tiles.length, 4);
            this.assertEqual(result.elements[0].bounds.col, 1);
            this.assertEqual(result.elements[0].bounds.row, 1);
            this.assertEqual(result.elements[0].bounds.width, 2);
            this.assertEqual(result.elements[0].bounds.height, 2);
        });
    }

    async testMultiLayerElementGrouped()
    {
        await this.test('Multi-layer element grouped under one instanceId', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer(
                    'tree-001-below-player',
                    [0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                ),
                ElementFixtures.buildLayer(
                    'tree-001-collisions',
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 200, 0, 0, 0, 0, 0, 0]
                )
            ]));
            this.assertEqual(result.elements.length, 1);
            this.assertEqual(result.elements[0].layers.length, 2);
        });
    }

    async testSkipReservedLayerNames()
    {
        await this.test('Reserved layer names skipped', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('ground', []),
                ElementFixtures.buildLayer('ground-variations', []),
                ElementFixtures.buildLayer('change-points', []),
                ElementFixtures.buildLayer('spot-layer-mySpot', []),
                ElementFixtures.buildLayer('borders', [])
            ]));
            this.assertEqual(result.elements.length, 0);
            this.assertEqual(result.bordersLayer, 'borders');
        });
    }

    async testLayerWithoutNumericIndexSkipped()
    {
        await this.test('Layer name without numeric segment skipped', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                ElementFixtures.buildLayer('no-numeric-part', [1, 0, 0, 0])
            ]));
            this.assertEqual(result.elements.length, 0);
        });
    }

    async testMissingMapJsonReturnsWarning()
    {
        await this.test('Missing mapJson returns no-map-json warning', async () => {
            let result = new ElementsFromLayersLoader().load(null);
            this.assertEqual(result.elements.length, 0);
            this.assert(-1 !== result.warnings.indexOf('no-map-json'));
        });
    }

    async testNonTilelayerSkipped()
    {
        await this.test('Non-tilelayer types skipped', async () => {
            let result = new ElementsFromLayersLoader().load(ElementFixtures.buildMap([
                {type: 'objectgroup', name: 'tree-001-below-player', objects: []}
            ]));
            this.assertEqual(result.elements.length, 0);
        });
    }
}

module.exports.TestElementsFromLayersLoader = TestElementsFromLayersLoader;
