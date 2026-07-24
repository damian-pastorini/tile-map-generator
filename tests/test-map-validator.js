/**
 *
 * Reldens - Test Map Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapValidator } = require('../lib/validator/map-validator');

class TestMapValidator extends BaseMapGeneratorTest
{

    buildValidMap()
    {
        let layers = [];
        layers.push({name: 'ground', type: 'tilelayer', width: 2, height: 2, data: [0, 0, 0, 0]});
        return {type: 'map', width: 2, height: 2, layers};
    }

    async testValidMapPasses()
    {
        await this.test('Structurally valid map passes base validation', async () => {
            let validator = new MapValidator();
            let result = validator.validateMap(this.buildValidMap(), {});
            this.assert(true === result, 'Valid map should pass');
            this.assertEqual(validator.validationErrors.length, 0, 'No errors expected');
        });
    }

    async testInvalidMapStructureFails()
    {
        await this.test('Map missing type fails and records error', async () => {
            let validator = new MapValidator();
            let map = this.buildValidMap();
            delete map.type;
            let result = validator.validateMap(map, {});
            this.assert(false === result, 'Invalid map should fail');
            this.assert(0 < validator.validationErrors.length, 'Errors should be recorded');
        });
    }

    async testInvalidConfigurationFails()
    {
        await this.test('Non-object configuration fails validation', async () => {
            let validator = new MapValidator();
            let result = validator.validateMap(this.buildValidMap(), null);
            this.assert(false === result, 'Null config should fail');
            this.assert(0 < validator.validationErrors.length, 'Config error should be recorded');
        });
    }

    async testClassifyNonZeroTilesFindsViolations()
    {
        await this.test('classifyNonZeroTiles reports disallowed tiles', async () => {
            let validator = new MapValidator();
            let violations = validator.classifyNonZeroTiles([0, 5, 9, 0], [5], (tile, index) => ({tile, index}));
            this.assertEqual(violations.length, 1, 'One disallowed tile expected');
            this.assertEqual(violations[0].tile, 9, 'Violation should reference disallowed tile');
        });
    }

    async testClearValidationState()
    {
        await this.test('clearValidationState empties accumulated validation arrays', async () => {
            let validator = new MapValidator();
            validator.validationErrors.push('e');
            validator.validationWarnings.push('w');
            validator.validationResults.push({message: 'r'});
            validator.clearValidationState();
            this.assertEqual(validator.validationErrors.length, 0, 'Errors should be cleared');
            this.assertEqual(validator.validationWarnings.length, 0, 'Warnings should be cleared');
            this.assertEqual(validator.validationResults.length, 0, 'Results should be cleared');
        });
    }

    async testLogValidationWarningRecordsMessage()
    {
        await this.test('logValidationWarning records the warning message', async () => {
            let validator = new MapValidator();
            validator.logValidationWarning('careful here');
            this.assertEqual(validator.validationWarnings.length, 1, 'One warning expected');
            this.assertEqual(validator.validationWarnings[0], 'careful here', 'Warning text should be stored');
        });
    }

    async testLogValidationResultRecordsEntry()
    {
        await this.test('logValidationResult records message and data', async () => {
            let validator = new MapValidator();
            validator.logValidationResult('step done', {count: 3});
            this.assertEqual(validator.validationResults.length, 1, 'One result expected');
            this.assertEqual(validator.validationResults[0].message, 'step done', 'Result message should be stored');
            this.assertEqual(validator.validationResults[0].data.count, 3, 'Result data should be stored');
        });
    }

    async testRunValidationPipelineStopsOnFailure()
    {
        await this.test('runValidationPipeline returns false and stops at the failing step', async () => {
            let validator = new MapValidator();
            let ranThird = false;
            let steps = [
                {label: 'first', run: () => ({isValid: true})},
                {label: 'second', run: () => ({isValid: false})},
                {label: 'third', run: () => {
                    ranThird = true;
                    return {isValid: true};
                }}
            ];
            let result = validator.runValidationPipeline(steps);
            this.assert(false === result, 'Pipeline should fail on second step');
            this.assert(false === ranThird, 'Third step should not run after a failure');
            this.assertEqual(validator.validationResults.length, 2, 'Two results logged before stopping');
        });
    }

    async testRunValidationPipelineAllPass()
    {
        await this.test('runValidationPipeline returns true when all steps pass', async () => {
            let validator = new MapValidator();
            let steps = [
                {label: 'first', run: () => ({isValid: true})},
                {label: 'second', run: () => ({isValid: true})}
            ];
            let result = validator.runValidationPipeline(steps);
            this.assert(true === result, 'All passing steps should return true');
            this.assertEqual(validator.validationResults.length, 2, 'Both results should be logged');
        });
    }

    async testFindLayerByName()
    {
        await this.test('findLayerByName returns the matching layer or null', async () => {
            let validator = new MapValidator();
            let map = {layers: [{name: 'path', data: [1]}, {name: 'ground', data: [0]}]};
            let found = validator.findLayerByName(map, 'ground');
            this.assert(null !== found, 'Existing layer should be found');
            this.assertEqual(found.name, 'ground', 'Found layer name should match');
            this.assertEqual(validator.findLayerByName(map, 'missing'), null, 'Missing layer should return null');
        });
    }

}

module.exports.TestMapValidator = TestMapValidator;
