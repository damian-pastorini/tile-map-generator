/**
 *
 * Reldens - Test Layer Component Splitter
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { LayerComponentSplitter } = require('../lib/map/layer-component-splitter');

class TestLayerComponentSplitter extends BaseMapGeneratorTest
{

    buildGridWithTwoComponents()
    {
        let data = new Array(16).fill(0);
        data[0] = 10;
        data[15] = 20;
        return data;
    }

    buildGridWithSingleComponent()
    {
        let data = new Array(16).fill(0);
        data[5] = 30;
        data[6] = 31;
        return data;
    }

    async testPassThroughNonTileLayers()
    {
        let layers = [{type: 'objectgroup', name: 'objects'}];
        await this.test('splitMapLayers passes through non tilelayer entries', async () => {
            let splitter = new LayerComponentSplitter();
            let result = splitter.splitMapLayers(layers, 4, 4);
            this.assertEqual(result.length, 1, 'Non tile layers should pass through');
            this.assertEqual(result[0].name, 'objects', 'Pass-through layer should be preserved');
        });
    }

    async testPassThroughUnparsableLayers()
    {
        let layers = [{type: 'tilelayer', name: 'ground', data: new Array(16).fill(0)}];
        await this.test('splitMapLayers passes through layers whose name is not an element layer', async () => {
            let splitter = new LayerComponentSplitter();
            let result = splitter.splitMapLayers(layers, 4, 4);
            this.assertEqual(result.length, 1, 'Unparsable layer should pass through');
            this.assertEqual(result[0].name, 'ground', 'Pass-through name should be preserved');
        });
    }

    async testSingleComponentKeepsOriginalLayer()
    {
        let layers = [{type: 'tilelayer', name: 'tree0-base', data: this.buildGridWithSingleComponent()}];
        await this.test('splitMapLayers keeps original layer when a single component is found', async () => {
            let splitter = new LayerComponentSplitter();
            let result = splitter.splitMapLayers(layers, 4, 4);
            this.assertEqual(result.length, 1, 'Single component should not split');
            this.assertEqual(result[0].name, 'tree0-base', 'Original layer name should be preserved');
        });
    }

    async testTwoComponentsSplitIntoSeparateLayers()
    {
        let layers = [{type: 'tilelayer', name: 'tree0-base', data: this.buildGridWithTwoComponents()}];
        await this.test('splitMapLayers splits two disconnected components into separate layers', async () => {
            let splitter = new LayerComponentSplitter();
            let result = splitter.splitMapLayers(layers, 4, 4);
            this.assertEqual(result.length, 2, 'Two components should yield two layers');
            this.assertEqual(result[0].name, 'tree-1-base', 'First split should use global index 1');
            this.assertEqual(result[1].name, 'tree-2-base', 'Second split should use global index 2');
        });
    }

    async testSplitLayersIsolateComponentTiles()
    {
        let layers = [{type: 'tilelayer', name: 'tree0-base', data: this.buildGridWithTwoComponents()}];
        await this.test('split layers contain only their own component tiles', async () => {
            let splitter = new LayerComponentSplitter();
            let result = splitter.splitMapLayers(layers, 4, 4);
            this.assertEqual(result[0].data[0], 10, 'First component layer should keep its tile');
            this.assertEqual(result[0].data[15], 0, 'First component layer should not include the other component');
            this.assertEqual(result[1].data[15], 20, 'Second component layer should keep its tile');
            this.assertEqual(result[1].data[0], 0, 'Second component layer should not include the other component');
        });
    }

    async testMultiLayerInstanceSplitsTogether()
    {
        let baseData = this.buildGridWithTwoComponents();
        let collisionData = this.buildGridWithTwoComponents();
        let layers = [
            {type: 'tilelayer', name: 'tree0-base', data: baseData},
            {type: 'tilelayer', name: 'tree0-collisions', data: collisionData}
        ];
        await this.test('multi layer instance splits all source layers per component', async () => {
            let splitter = new LayerComponentSplitter();
            let result = splitter.splitMapLayers(layers, 4, 4);
            this.assertEqual(result.length, 4, 'Two components across two layers should yield four layers');
            let names = result.map(layer => layer.name);
            this.assert(0 <= names.indexOf('tree-1-base'), 'Should include base for first component');
            this.assert(0 <= names.indexOf('tree-1-collisions'), 'Should include collisions for first component');
        });
    }

}

module.exports.TestLayerComponentSplitter = TestLayerComponentSplitter;
