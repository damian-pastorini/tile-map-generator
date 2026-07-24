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
            let result = validator.validateElementQuantities(this.buildSingleTreeMap(), this.buildTreeConfig());
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
            let map = this.buildTwoTreeMap(5, 5);
            let result = validator.validateElementOverlaps(map, {elementsQuantity: {tree: 2}});
            this.assert(false === result.isValid, 'Overlapping elements should fail');
            this.assert(0 < result.overlapCount, 'Overlap should be counted');
        });
    }

    async testNoOverlapPasses()
    {
        await this.test('Separated element instances pass overlap validation', async () => {
            let validator = new ElementPlacementValidator();
            let map = this.buildTwoTreeMap(0, 15);
            let result = validator.validateElementOverlaps(map, {elementsQuantity: {tree: 2}});
            this.assert(true === result.isValid, 'Separated elements should pass');
            this.assertEqual(result.overlapCount, 0, 'No overlaps expected');
        });
    }

    async testExtractElementDimensions()
    {
        await this.test('extractElementDimensions reads the first tilelayer or returns null', async () => {
            let validator = new ElementPlacementValidator();
            let elementConfig = [{type: 'objectgroup'}, {type: 'tilelayer', width: 3, height: 2, data: [0]}];
            let dims = validator.extractElementDimensions(elementConfig);
            this.assert(null !== dims, 'A tilelayer config should produce dimensions');
            this.assertEqual(dims.width, 3, 'Width should be read from the tilelayer');
            this.assertEqual(dims.height, 2, 'Height should be read from the tilelayer');
            this.assertEqual(validator.extractElementDimensions({}), null, 'Non-array config should return null');
            this.assertEqual(validator.extractElementDimensions([{type: 'objectgroup'}]), null, 'No tilelayer returns null');
        });
    }

    async testValidateSingleElementPosition()
    {
        await this.test('validateSingleElementPosition checks dimensions and tile count', async () => {
            let validator = new ElementPlacementValidator();
            let elementData = {width: 2, height: 2};
            let good = {width: 2, height: 2, tilePositions: [1, 2, 3, 4]};
            let okResult = validator.validateSingleElementPosition(good, elementData, {});
            this.assert(true === okResult.isValid, 'Matching position should be valid');
            let bad = {width: 1, height: 2, tilePositions: [1, 2]};
            let badResult = validator.validateSingleElementPosition(bad, elementData, {});
            this.assert(false === badResult.isValid, 'Mismatched width should be invalid');
            this.assert(0 < badResult.violations.length, 'Violations should be recorded');
        });
    }

    async testValidatePositionsForElement()
    {
        await this.test('validatePositionsForElement tallies valid and invalid positions', async () => {
            let validator = new ElementPlacementValidator();
            let positions = [
                {width: 2, height: 2, tilePositions: [1, 2, 3, 4]},
                {width: 1, height: 1, tilePositions: [1]}
            ];
            let result = validator.validatePositionsForElement(positions, {width: 2, height: 2}, {});
            this.assertEqual(result.validCount, 1, 'One position should be valid');
            this.assertEqual(result.invalidCount, 1, 'One position should be invalid');
            this.assert(false === result.isValid, 'Overall should be invalid');
        });
    }

    async testValidateElementPositionsMatching()
    {
        await this.test('validateElementPositions validates a placed element against its config', async () => {
            let validator = new ElementPlacementValidator();
            let result = validator.validateElementPositions(this.buildSingleTreeMap(), this.buildTreeConfig());
            this.assert(true === result.isValid, 'Matching element position should pass');
            this.assertEqual(result.validPositions, 1, 'One valid position expected');
            this.assertEqual(result.totalElements, 1, 'One element expected');
        });
    }

    async testValidateElementBoundariesWithin()
    {
        await this.test('validateElementBoundaries counts an in-bounds element', async () => {
            let validator = new ElementPlacementValidator();
            let result = validator.validateElementBoundaries(this.buildSingleTreeMap(), this.buildTreeConfig());
            this.assert(true === result.isValid, 'In-bounds element should pass');
            this.assertEqual(result.withinBoundaries, 1, 'One within-boundaries element expected');
        });
    }

    async testCheckElementsOverlapDirect()
    {
        await this.test('checkElementsOverlap computes overlap area or none', async () => {
            let validator = new ElementPlacementValidator();
            let overlap = validator.checkElementsOverlap(
                {x: 0, y: 0, width: 2, height: 2},
                {x: 1, y: 1, width: 2, height: 2}
            );
            this.assert(true === overlap.hasOverlap, 'Overlapping rects should report overlap');
            this.assertEqual(overlap.overlapArea.x, 1, 'Overlap left edge expected at x=1');
            this.assertEqual(overlap.overlapArea.width, 1, 'Overlap width should be 1');
            let none = validator.checkElementsOverlap(
                {x: 0, y: 0, width: 1, height: 1},
                {x: 3, y: 3, width: 1, height: 1}
            );
            this.assert(false === none.hasOverlap, 'Separated rects should not overlap');
            this.assertEqual(none.overlapArea, null, 'No overlap area expected');
        });
    }

    async testPerformValidationPasses()
    {
        await this.test('Full element placement validation passes for one well-formed element', async () => {
            let validator = new ElementPlacementValidator();
            let result = validator.validateMap(this.buildSingleTreeMap(), this.buildTreeConfig());
            this.assert(true === result, 'Well-formed single element map should pass full validation');
        });
    }

    buildTwoTreeMap(indexA, indexB)
    {
        let layers = [];
        layers.push({name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 4, data: this.tileAt(indexA)});
        layers.push({name: 'tree1-below-player', type: 'tilelayer', width: 4, height: 4, data: this.tileAt(indexB)});
        return {width: 4, height: 4, layers};
    }

    buildSingleTreeMap()
    {
        let layers = [];
        layers.push({name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 4, data: this.tileAt(5)});
        return {type: 'map', width: 4, height: 4, layers};
    }

    buildTreeConfig()
    {
        let config = {elementsQuantity: {tree: 1}, layerElements: {}};
        config.layerElements.tree = [{type: 'tilelayer', width: 1, height: 1, data: [100]}];
        return config;
    }

    tileAt(index)
    {
        let data = new Array(16).fill(0);
        data[index] = 100;
        return data;
    }

}

module.exports.TestElementPlacementValidator = TestElementPlacementValidator;
