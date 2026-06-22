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

    async testFindLayerByName()
    {
        let map = this.buildMap();
        await this.test('findLayerByName returns the matching layer', async () => {
            let layer = LayerUtility.findLayerByName(map, 'path');
            this.assert(layer, 'layer should be found');
            this.assertEqual(layer.name, 'path', 'matched layer name is path');
        });
        await this.test('findLayerByName returns null when no layer matches', async () => {
            this.assertEqual(LayerUtility.findLayerByName(map, 'missing'), null, 'no match returns null');
        });
    }

    async testFindLayerByNamePrefix()
    {
        let map = this.buildMap();
        await this.test('findLayerByNamePrefix returns the first prefixed layer', async () => {
            let layer = LayerUtility.findLayerByNamePrefix(map, 'tree');
            this.assertEqual(layer.name, 'tree0-collisions', 'first tree layer returned');
        });
        await this.test('findLayerByNamePrefix returns null when nothing starts with prefix', async () => {
            this.assertEqual(LayerUtility.findLayerByNamePrefix(map, 'rock'), null, 'no prefixed layer returns null');
        });
    }

    async testFindLayersByNamePrefix()
    {
        let map = this.buildMap();
        await this.test('findLayersByNamePrefix returns all prefixed layers', async () => {
            let layers = LayerUtility.findLayersByNamePrefix(map, 'tree');
            this.assertEqual(layers.length, 2, 'two tree layers returned');
        });
        await this.test('findLayersByNamePrefix returns an empty array when none match', async () => {
            let layers = LayerUtility.findLayersByNamePrefix(map, 'rock');
            this.assertEqual(layers.length, 0, 'no matches returns empty array');
        });
    }

    async testFindLayersByNameContains()
    {
        let map = this.buildMap();
        await this.test('findLayersByNameContains returns layers containing the search string', async () => {
            let layers = LayerUtility.findLayersByNameContains(map, 'collisions');
            this.assertEqual(layers.length, 2, 'two layers contain collisions');
        });
        await this.test('findLayersByNameContains returns empty array on a map without layers', async () => {
            let layers = LayerUtility.findLayersByNameContains({}, 'collisions');
            this.assertEqual(layers.length, 0, 'missing layers yields empty array');
        });
    }

}

module.exports.TestLayerUtility = TestLayerUtility;
