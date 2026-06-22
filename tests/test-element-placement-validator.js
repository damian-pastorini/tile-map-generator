/**
 *
 * Reldens - Test Element Placement Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementPlacementValidator } = require('../lib/validator/element-placement-validator');

class TestElementPlacementValidator extends BaseMapGeneratorTest
{

    async testNoElementsQuantityPasses()
    {
        await this.test('Empty elementsQuantity passes quantity validation', async () => {
            let validator = new ElementPlacementValidator();
            let result = validator.validateElementQuantities({layers: []}, {elementsQuantity: {}});
            this.assert(true === result.isValid, 'No elements configured should pass');
            this.assertEqual(result.reason, 'No elements configured', 'Expected no elements reason');
        });
    }

    async testElementQuantityMatchPasses()
    {
        await this.test('Matching element count passes quantity validation', async () => {
            let validator = new ElementPlacementValidator();
            let map = {
                width: 4,
                height: 4,
                layers: [{name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 4, data: this.singleTile()}]
            };
            let config = {
                elementsQuantity: {tree: 1},
                layerElements: {tree: [{type: 'tilelayer', width: 4, height: 4, data: this.singleTile()}]}
            };
            let result = validator.validateElementQuantities(map, config);
            this.assert(true === result.isValid, 'Matching quantity should pass');
            this.assertEqual(result.totalActual, 1, 'One actual element expected');
        });
    }

    async testElementQuantityMismatchFails()
    {
        await this.test('Missing element instance fails quantity validation', async () => {
            let validator = new ElementPlacementValidator();
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateElementQuantities(map, {elementsQuantity: {tree: 2}});
            this.assert(false === result.isValid, 'Mismatched quantity should fail');
            this.assertEqual(result.totalActual, 0, 'No elements found expected');
        });
    }

    async testElementOverlapDetected()
    {
        await this.test('Overlapping element instances fail overlap validation', async () => {
            let validator = new ElementPlacementValidator();
            let map = {
                width: 4,
                height: 4,
                layers: [
                    {name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 4, data: this.tileAt(5)},
                    {name: 'tree1-below-player', type: 'tilelayer', width: 4, height: 4, data: this.tileAt(5)}
                ]
            };
            let result = validator.validateElementOverlaps(map, {elementsQuantity: {tree: 2}});
            this.assert(false === result.isValid, 'Overlapping elements should fail');
            this.assert(0 < result.overlapCount, 'Overlap should be counted');
        });
    }

    async testNoOverlapPasses()
    {
        await this.test('Separated element instances pass overlap validation', async () => {
            let validator = new ElementPlacementValidator();
            let map = {
                width: 4,
                height: 4,
                layers: [
                    {name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 4, data: this.tileAt(0)},
                    {name: 'tree1-below-player', type: 'tilelayer', width: 4, height: 4, data: this.tileAt(15)}
                ]
            };
            let result = validator.validateElementOverlaps(map, {elementsQuantity: {tree: 2}});
            this.assert(true === result.isValid, 'Separated elements should pass');
            this.assertEqual(result.overlapCount, 0, 'No overlaps expected');
        });
    }

    singleTile()
    {
        return this.tileAt(5);
    }

    tileAt(index)
    {
        let data = new Array(16).fill(0);
        data[index] = 100;
        return data;
    }

}

module.exports.TestElementPlacementValidator = TestElementPlacementValidator;
