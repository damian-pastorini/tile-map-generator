/**
 *
 * Reldens - Test Element Layer Name
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementLayerName } = require('../lib/map/element-layer-name');

class TestElementLayerName extends BaseMapGeneratorTest
{

    constructor()
    {
        super();
        this.elementLayerName = new ElementLayerName();
    }

    async testBuildFusesInstanceWhenSourcePrefixed()
    {
        await this.test('build fuses the instance number when the source layer is element-prefixed', async () => {
            this.assertEqual(this.elementLayerName.build('tree', 0, 'tree-collisions'), 'tree0-collisions');
            this.assertEqual(this.elementLayerName.build('tree', 1, 'tree-over-player'), 'tree1-over-player');
            this.assertEqual(
                this.elementLayerName.build('house-02', 2, 'house-02-collisions-over-player'),
                'house-022-collisions-over-player'
            );
        });
    }

    async testBuildScopesUnprefixedSource()
    {
        await this.test('build element-scopes a source layer not prefixed with the element key', async () => {
            this.assertEqual(this.elementLayerName.build('tree', 0, 'collisions'), 'tree0-collisions');
            this.assertEqual(this.elementLayerName.build('house1', 0, 'over-player'), 'house10-over-player');
        });
    }

    async testBuildHandlesMultiDashElementKey()
    {
        await this.test('build handles element keys that contain dashes', async () => {
            this.assertEqual(
                this.elementLayerName.build('tree-stump', 0, 'tree-stump-collisions'),
                'tree-stump0-collisions'
            );
            this.assertEqual(this.elementLayerName.build('water-well', 3, 'over-player'), 'water-well3-over-player');
        });
    }

    async testBuildKeepsPathUnified()
    {
        await this.test('build keeps the shared path layer name unchanged so element paths merge', async () => {
            this.assertEqual(this.elementLayerName.build('tree', 0, 'path'), 'path');
            this.assertEqual(this.elementLayerName.build('house-02', 5, 'path'), 'path');
        });
    }

    async testBuildKeepsSingleNameSpotLayer()
    {
        await this.test('build keeps an isElement spot layer (key equals layer name) unchanged', async () => {
            this.assertEqual(
                this.elementLayerName.build('ground-spot-depth-spot-s0', 0, 'ground-spot-depth-spot-s0'),
                'ground-spot-depth-spot-s0'
            );
        });
    }

    async testInstanceIndexParsesFusedName()
    {
        await this.test('instanceIndex extracts the fused instance number', async () => {
            this.assertEqual(this.elementLayerName.instanceIndex('tree', 'tree0-collisions'), '0');
            this.assertEqual(this.elementLayerName.instanceIndex('tree', 'tree10-over-player'), '10');
            this.assertEqual(this.elementLayerName.instanceIndex('house-02', 'house-022-collisions-over-player'), '2');
        });
    }

    async testInstanceIndexReturnsNullForNonInstanceLayers()
    {
        await this.test('instanceIndex returns null for layers without a fused instance number', async () => {
            this.assertEqual(this.elementLayerName.instanceIndex('tree', 'tree-collisions'), null);
            this.assertEqual(this.elementLayerName.instanceIndex('tree', 'ground'), null);
            this.assertEqual(this.elementLayerName.instanceIndex('tree', 'path'), null);
        });
    }

    async testInstanceIndexDoesNotMatchOtherElements()
    {
        await this.test('instanceIndex does not claim a different element whose key shares the prefix', async () => {
            this.assertEqual(this.elementLayerName.instanceIndex('tree', 'tree-stump0-collisions'), null);
        });
    }

    async testBuildAndInstanceIndexRoundTrip()
    {
        await this.test('build then instanceIndex round-trips the instance number', async () => {
            let elementType = 'house-02';
            for(let instanceNumber = 0; instanceNumber < 5; instanceNumber++){
                let layerName = this.elementLayerName.build(elementType, instanceNumber, 'house-02-collisions');
                this.assertEqual(this.elementLayerName.instanceIndex(elementType, layerName), String(instanceNumber));
            }
        });
    }

}

module.exports.TestElementLayerName = TestElementLayerName;
