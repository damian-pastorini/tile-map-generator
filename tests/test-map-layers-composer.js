/**
 *
 * Reldens - Test Map Layers Composer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapLayersComposer } = require('../lib/generator/map-layers-composer');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class TestMapLayersComposer extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            layerDataFactory: new LayerDataFactory(),
            generateSpotsWithDepth: {}
        };
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            this.assert(composer instanceof MapLayersComposer, 'Expected MapLayersComposer instance');
            this.assert('function' === typeof composer.generateLayersList, 'Expected generateLayersList method');
            this.assert('function' === typeof composer.mergeLayersByTileValue, 'Expected mergeLayersByTileValue method');
        });
    }

    async testIsValidLayer()
    {
        await this.test('isValidLayer requires non-empty array', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            this.assertEqual(composer.isValidLayer([1, 2]), true);
            this.assertEqual(composer.isValidLayer([]), false);
            this.assertEqual(composer.isValidLayer(null), false);
        });
    }

    async testReplaceNullTiles()
    {
        await this.test('replaceNullTiles converts null entries to zero', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            let result = composer.replaceNullTiles([1, null, 3, null], 'test');
            this.assertDeepEqual(result, [1, 0, 3, 0]);
        });
    }

    async testApplyLayersIds()
    {
        await this.test('applyLayersIds assigns sequential ids from 1', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            let layers = [{name: 'a'}, {name: 'b'}, {name: 'c'}];
            composer.applyLayersIds(layers);
            this.assertEqual(layers[0].id, 1);
            this.assertEqual(layers[1].id, 2);
            this.assertEqual(layers[2].id, 3);
        });
    }

    async testHasTileCollision()
    {
        await this.test('hasTileCollision detects overlapping non-zero tiles', async () => {
            let factory = new LayerDataFactory();
            this.assertEqual(factory.hasTileCollision([1, 0, 0], [0, 0, 2]), false);
            this.assertEqual(factory.hasTileCollision([1, 0, 0], [3, 0, 0]), true);
        });
    }

    async testFetchFirstTilesLayer()
    {
        await this.test('fetchFirstTilesLayer returns first tilelayer', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            let layers = [
                {type: 'objectgroup', name: 'objects'},
                {type: 'tilelayer', name: 'ground'}
            ];
            let result = composer.fetchFirstTilesLayer(layers);
            this.assertEqual(result.name, 'ground');
            this.assertEqual(composer.fetchFirstTilesLayer([{type: 'objectgroup'}]), false);
        });
    }

    async testMergeLayers()
    {
        await this.test('mergeLayers overlays second over first preserving base order', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            let result = composer.mergeLayers([0, 5, 0], [1, 0, 0]);
            this.assertDeepEqual(result, [1, 5, 0]);
        });
    }

    async testMergeLayersByTileValue()
    {
        await this.test('mergeLayersByTileValue merges same-named layers by tile value', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            let staticLayers = [{name: 'ground', data: [1, 0, 0]}];
            let additionalLayers = [{name: 'ground', data: [0, 2, 0]}];
            let result = composer.mergeLayersByTileValue(staticLayers, additionalLayers);
            this.assertEqual(result.length, 1);
            this.assertDeepEqual(result[0].data, [1, 2, 0]);
        });
    }

    async testCalculateTargetIndexNumeric()
    {
        await this.test('calculateTargetIndex resolves numeric and edge depths', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            let layerMap = new Map();
            this.assertEqual(composer.calculateTargetIndex(0, 5, layerMap), 1);
            this.assertEqual(composer.calculateTargetIndex(2, 5, layerMap), 2);
            this.assertEqual(composer.calculateTargetIndex(10, 5, layerMap), 4);
        });
    }

    async testMergeLayersByNameSubstring()
    {
        await this.test('mergeLayersByNameSubstring merges matching layers without collisions', async () => {
            let composer = new MapLayersComposer(this.buildGeneratorStub());
            let layers = [
                {name: 'tree-below', data: [1, 0, 0]},
                {name: 'tree-extra', data: [0, 2, 0]},
                {name: 'other', data: [0, 0, 3]}
            ];
            let result = composer.mergeLayersByNameSubstring(layers, 'tree');
            this.assertEqual(result.length, 2);
            this.assert(result[0].name.startsWith('merge-'), 'Expected merge prefix on combined layer');
            this.assertDeepEqual(result[0].data, [1, 2, 0]);
            this.assertEqual(result[1].name, 'other');
        });
    }

}

module.exports.TestMapLayersComposer = TestMapLayersComposer;
