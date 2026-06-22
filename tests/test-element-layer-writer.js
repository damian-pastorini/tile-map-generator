/**
 *
 * Reldens - Test Element Layer Writer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementLayerWriter } = require('../lib/generator/element-layer-writer');
const { ElementLayerName } = require('../lib/map/element-layer-name');
const { MapNaming } = require('../lib/map/map-naming');

class TestElementLayerWriter extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            tilePositionCalculator: {},
            elementLayerName: new ElementLayerName(),
            mapNaming: new MapNaming(),
            mapName: 'town-01'
        };
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            this.assert(writer instanceof ElementLayerWriter, 'Expected ElementLayerWriter instance');
            this.assert('function' === typeof writer.updateLayerData, 'Expected updateLayerData method');
            this.assert('function' === typeof writer.provideElementKey, 'Expected provideElementKey method');
        });
    }

    async testProvideReturnPositionKeyFromLayerDefault()
    {
        await this.test('provideReturnPositionKeyFromLayer defaults to down', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            this.assertEqual(writer.provideReturnPositionKeyFromLayer(null), 'down');
            this.assertEqual(writer.provideReturnPositionKeyFromLayer({}), 'down');
        });
    }

    async testProvideReturnPositionKeyFromLayerProperty()
    {
        await this.test('provideReturnPositionKeyFromLayer reads position property', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            let layer = {properties: [{name: 'position', value: 'up'}]};
            this.assertEqual(writer.provideReturnPositionKeyFromLayer(layer), 'up');
        });
    }

    async testRemoveFloorFromMapNamePlain()
    {
        await this.test('removeFloorFromMapName keeps plain map name', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub({mapName: 'town-01'}));
            this.assertEqual(writer.removeFloorFromMapName(), 'town-01');
        });
    }

    async testRemoveFloorFromMapNameUpper()
    {
        await this.test('removeFloorFromMapName strips upper floor suffix', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub({mapName: 'town-01-upperFloor-n2'}));
            this.assertEqual(writer.removeFloorFromMapName(), 'town-01');
        });
    }

    async testRemoveFloorFromMapNameDown()
    {
        await this.test('removeFloorFromMapName strips down floor suffix', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub({mapName: 'town-01-downFloor-n1'}));
            this.assertEqual(writer.removeFloorFromMapName(), 'town-01');
        });
    }

    async testProvideElementKeyNonStairs()
    {
        await this.test('provideElementKey builds non-stairs key', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            let elementData = {name: 'house-change-points'};
            let key = writer.provideElementKey('town-01', elementData, 2, 0, '');
            this.assertEqual(key, 'town-01-house-n2');
        });
    }

}

module.exports.TestElementLayerWriter = TestElementLayerWriter;
