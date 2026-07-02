/**
 *
 * Reldens - Test Boundary Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { BoundaryValidator } = require('../lib/validator/boundary-validator');

class TestBoundaryValidator extends BaseMapGeneratorTest
{

    async testElementWithinBoundariesValid()
    {
        await this.test('Element fully inside map passes boundary check', async () => {
            let validator = new BoundaryValidator();
            let result = validator.checkElementWithinBoundaries({x: 1, y: 1, width: 2, height: 2}, 10, 10);
            this.assert(true === result.isValid, 'Element within boundaries should be valid');
            this.assertEqual(result.violations.length, 0, 'No violations expected');
        });
    }

    async testElementOutsideBoundariesInvalid()
    {
        await this.test('Element exceeding right and bottom fails boundary check', async () => {
            let validator = new BoundaryValidator();
            let result = validator.checkElementWithinBoundaries({x: 9, y: 9, width: 3, height: 3}, 10, 10);
            this.assert(false === result.isValid, 'Out of bounds element should be invalid');
            this.assert(0 < result.violations.length, 'Violations should be reported');
        });
    }

    async testElementNegativeBoundariesInvalid()
    {
        await this.test('Element with negative position fails boundary check', async () => {
            let validator = new BoundaryValidator();
            let result = validator.checkElementWithinBoundaries({x: -1, y: -1, width: 1, height: 1}, 10, 10);
            this.assert(false === result.isValid, 'Negative position should be invalid');
            this.assertEqual(result.violations.length, 2, 'Left and top violations expected');
        });
    }

    async testValidateMapStructureValid()
    {
        await this.test('Well formed map passes structure validation', async () => {
            let validator = new BoundaryValidator();
            let groundLayer = {name: 'ground', type: 'tilelayer', width: 4, height: 4, data: new Array(16).fill(0)};
            let map = {type: 'map', width: 4, height: 4, layers: [groundLayer]};
            let result = validator.validateMapStructure(map);
            this.assert(true === result.isValid, 'Valid map structure should pass');
        });
    }

    async testValidateMapStructureInvalid()
    {
        await this.test('Map without type fails structure validation', async () => {
            let validator = new BoundaryValidator();
            let gLayer = {name: 'g', type: 'tilelayer', width: 4, height: 4, data: new Array(16).fill(0)};
            let result = validator.validateMapStructure({width: 4, height: 4, layers: [gLayer]});
            this.assert(false === result.isValid, 'Missing type should fail');
            this.assertEqual(result.error, 'Map type must be "map"', 'Expected type error message');
        });
    }

    async testValidateMapStructureNoLayers()
    {
        await this.test('Map with empty layers fails structure validation', async () => {
            let validator = new BoundaryValidator();
            let result = validator.validateMapStructure({type: 'map', width: 4, height: 4, layers: []});
            this.assert(false === result.isValid, 'Empty layers should fail');
            this.assertEqual(result.error, 'Map must have at least one layer', 'Expected layers error message');
        });
    }

    async testValidateLayerStructureValid()
    {
        await this.test('Matching layer dimensions pass layer validation', async () => {
            let validator = new BoundaryValidator();
            let groundLayer = {name: 'ground', type: 'tilelayer', width: 4, height: 4, data: new Array(16).fill(0)};
            let result = validator.validateLayerStructure(groundLayer, 4, 4, 0);
            this.assert(true === result.isValid, 'Valid layer should pass');
        });
    }

    async testValidateLayerStructureInvalid()
    {
        await this.test('Layer with wrong data length fails layer validation', async () => {
            let validator = new BoundaryValidator();
            let badLayer = {name: 'ground', type: 'tilelayer', width: 4, height: 4, data: new Array(8).fill(0)};
            let result = validator.validateLayerStructure(badLayer, 4, 4, 0);
            this.assert(false === result.isValid, 'Wrong data length should fail');
            this.assert(-1 !== result.error.indexOf('data length'), 'Expected data length error');
        });
    }

    async testValidateMapStructureNonObject()
    {
        await this.test('Non-object map fails structure validation', async () => {
            let validator = new BoundaryValidator();
            let result = validator.validateMapStructure(42);
            this.assert(false === result.isValid, 'Non-object map should fail');
            this.assertEqual(result.error, 'Map must be an object', 'Expected non-object error message');
        });
    }

    async testValidateMapStructureZeroWidth()
    {
        await this.test('Map with zero width fails structure validation', async () => {
            let validator = new BoundaryValidator();
            let validLayer = {name: 'g', type: 'tilelayer', width: 4, height: 4, data: new Array(16).fill(0)};
            let result = validator.validateMapStructure({type: 'map', width: 0, height: 4, layers: [validLayer]});
            this.assert(false === result.isValid, 'Zero width should fail');
            this.assertEqual(result.error, 'Map width must be positive: 0', 'Expected width error message');
        });
    }

    async testValidateLayerStructureMissingName()
    {
        await this.test('Layer without a name fails layer validation', async () => {
            let validator = new BoundaryValidator();
            let badLayer = {name: '', type: 'tilelayer', width: 4, height: 4, data: new Array(16).fill(0)};
            let result = validator.validateLayerStructure(badLayer, 4, 4, 2);
            this.assert(false === result.isValid, 'Missing name should fail');
            this.assertEqual(result.error, 'Layer 2 must have a name', 'Expected name error message');
        });
    }

    async testValidateLayerStructureNegativeTile()
    {
        await this.test('Layer with a negative tile fails layer validation', async () => {
            let validator = new BoundaryValidator();
            let data = new Array(16).fill(0);
            data[3] = -5;
            let badLayer = {name: 'ground', type: 'tilelayer', width: 4, height: 4, data};
            let result = validator.validateLayerStructure(badLayer, 4, 4, 0);
            this.assert(false === result.isValid, 'Negative tile should fail');
            this.assert(-1 !== result.error.indexOf('must be non-negative'), 'Expected non-negative tile error');
        });
    }

}

module.exports.TestBoundaryValidator = TestBoundaryValidator;
