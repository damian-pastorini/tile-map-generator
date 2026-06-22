/**
 *
 * Reldens - Test Return Point Writer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');

class TestReturnPointWriter extends BaseMapGeneratorTest
{

    async testRecordReturnPoint()
    {
        await this.test('recordReturnPoint stores record and pushes properties', async () => {
            let writer = new ReturnPointWriter();
            let generatedReturnPoints = {};
            let properties = [];
            let recordData = {mapIndex: 42, x: 3, y: 4, position: 'down'};
            writer.recordReturnPoint(generatedReturnPoints, properties, 'main', recordData, 'town', 'default-town');
            this.assertEqual(generatedReturnPoints['main'], recordData, 'Record should be stored under key');
            this.assertEqual(properties.length, 4, 'Should push four properties without isDefault');
            this.assertEqual(properties[0].name, 'return-point-for-default-town', 'For property name');
            this.assertEqual(properties[0].value, 42, 'For property value is mapIndex');
            this.assertEqual(properties[1].name, 'return-point-x-town', 'X property name');
            this.assertEqual(properties[1].value, 3, 'X property value');
            this.assertEqual(properties[2].name, 'return-point-y-town', 'Y property name');
            this.assertEqual(properties[2].value, 4, 'Y property value');
            this.assertEqual(properties[3].name, 'return-point-position-town', 'Position property name');
            this.assertEqual(properties[3].value, 'down', 'Position property value');
            this.assertEqual(properties[3].type, 'string', 'Position type is string');
        });
    }

    async testRecordReturnPointDefaultFlag()
    {
        await this.test('recordReturnPoint pushes isDefault property when default true', async () => {
            let writer = new ReturnPointWriter();
            let properties = [];
            let recordData = {mapIndex: 1, x: 1, y: 1, position: 'up'};
            writer.recordReturnPoint({}, properties, 'k', recordData, 'town', 'town', true);
            this.assertEqual(properties.length, 5, 'Should push five properties with isDefault');
            this.assertEqual(properties[4].name, 'return-point-isDefault-town', 'isDefault property name');
            this.assertEqual(properties[4].type, 'bool', 'isDefault type is bool');
            this.assertEqual(properties[4].value, true, 'isDefault value is true');
        });
    }

    async testRecordChangePoint()
    {
        await this.test('recordChangePoint stores record and pushes single property', async () => {
            let writer = new ReturnPointWriter();
            let generatedChangePoints = {};
            let properties = [];
            let recordData = {mapIndex: 77};
            writer.recordChangePoint(generatedChangePoints, properties, 'cp', recordData, 'town');
            this.assertEqual(generatedChangePoints['cp'], recordData, 'Change point stored under key');
            this.assertEqual(properties.length, 1, 'Should push one property');
            this.assertEqual(properties[0].name, 'change-point-for-town', 'Change point property name');
            this.assertEqual(properties[0].type, 'int', 'Change point type is int');
            this.assertEqual(properties[0].value, 77, 'Change point value is mapIndex');
        });
    }

}

module.exports.TestReturnPointWriter = TestReturnPointWriter;
