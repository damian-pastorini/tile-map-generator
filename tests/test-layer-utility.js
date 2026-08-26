/**
 *
 * Reldens - Test Layer Utility
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { LayerUtility } = require('../lib/map/layer-utility');

class TestLayerUtility extends BaseMapGeneratorTest
{

    buildMap()
    {
        let map = {
            width: 1,
            height: 5,
            layers: [
                {name: 'ground', data: [1]},
                {name: 'path', data: [2]},
                {name: 'tree0-collisions', data: [3]},
                {name: 'tree1-collisions', data: [4]},
                {name: 'house0-base', data: [5]}
            ]
        };
        map.type = 'map';
        return map;
    }

    async testFindLayerByExactName()
    {
        let map = this.buildMap();
        await this.test('findLayer with the exact match mode returns the matching layer', async () => {
            let layer = LayerUtility.findLayer(map, 'path', 'exact');
            this.assert(layer, 'layer should be found');
            this.assertEqual(layer.name, 'path', 'matched layer name is path');
        });
        await this.test('findLayer with the exact match mode returns null when no layer matches', async () => {
            this.assertEqual(LayerUtility.findLayer(map, 'missing', 'exact'), null, 'no match returns null');
        });
    }

    async testFindLayerByNamePrefix()
    {
        let map = this.buildMap();
        await this.test('findLayer with the prefix match mode returns the first prefixed layer', async () => {
            let layer = LayerUtility.findLayer(map, 'tree', 'prefix');
            this.assertEqual(layer.name, 'tree0-collisions', 'first tree layer returned');
        });
        await this.test('findLayer with the prefix match mode returns null when nothing matches', async () => {
            this.assertEqual(LayerUtility.findLayer(map, 'rock', 'prefix'), null, 'no prefixed layer returns null');
        });
    }

    async testFindLayersByNamePrefix()
    {
        let map = this.buildMap();
        await this.test('findLayers with the prefix match mode returns all prefixed layers', async () => {
            let layers = LayerUtility.findLayers(map, 'tree', 'prefix');
            this.assertEqual(layers.length, 2, 'two tree layers returned');
        });
        await this.test('findLayers with the prefix match mode returns an empty array when none match', async () => {
            let layers = LayerUtility.findLayers(map, 'rock', 'prefix');
            this.assertEqual(layers.length, 0, 'no matches returns empty array');
        });
    }

    async testFindLayersByNameContains()
    {
        let map = this.buildMap();
        await this.test('findLayers defaults to the contains match mode', async () => {
            let layers = LayerUtility.findLayers(map, 'collisions');
            this.assertEqual(layers.length, 2, 'two layers contain collisions');
        });
        await this.test('findLayers returns an empty array on a map without layers', async () => {
            let layers = LayerUtility.findLayers({}, 'collisions');
            this.assertEqual(layers.length, 0, 'missing layers yields empty array');
        });
        await this.test('findLayer defaults to the contains match mode and returns the first match', async () => {
            let layer = LayerUtility.findLayer(map, 'collisions');
            this.assertEqual(layer.name, 'tree0-collisions', 'first layer containing collisions returned');
        });
    }

}

module.exports.TestLayerUtility = TestLayerUtility;
