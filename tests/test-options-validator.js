/**
 *
 * Reldens - Test Options Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { OptionsValidator } = require('../lib/validator/options-validator');

class TestOptionsValidator extends BaseMapGeneratorTest
{

    buildValidOptions()
    {
        return {
            tileSize: 32,
            tileSheetPath: 'tilesheet.png',
            tileSheetName: 'tilesheet.png',
            imageHeight: 578,
            imageWidth: 612,
            tileCount: 306,
            columns: 18,
            groundTile: 116,
            layerElements: {tree: []},
            elementsQuantity: {tree: 1}
        };
    }

    async testValidOptionsPass()
    {
        await this.test('Complete options pass validation', async () => {
            let validator = new OptionsValidator();
            let result = validator.validate(this.buildValidOptions());
            this.assert(true === result, 'Valid options should return true');
            this.assertEqual(validator.lastError, null, 'No error expected on valid options');
        });
    }

    async testMissingRequiredKeyFails()
    {
        await this.test('Missing groundTile fails validation', async () => {
            let validator = new OptionsValidator();
            let options = this.buildValidOptions();
            delete options.groundTile;
            let result = validator.validate(options);
            this.assert(false === result, 'Missing key should return false');
            this.assertEqual(validator.lastError, 'Missing required option: "groundTile".', 'Expected missing key error');
        });
    }

    async testMissingElementsQuantityFails()
    {
        await this.test('Empty elementsQuantity fails validation', async () => {
            let validator = new OptionsValidator();
            let options = this.buildValidOptions();
            options.elementsQuantity = {};
            let result = validator.validate(options);
            this.assert(false === result, 'Empty elementsQuantity should return false');
            this.assertEqual(
                validator.lastError,
                'Missing required option: "elementsQuantity".',
                'Expected elementsQuantity error'
            );
        });
    }

    async testNegativeMainPathSizeFails()
    {
        await this.test('Negative mainPathSize fails validation', async () => {
            let validator = new OptionsValidator();
            let options = this.buildValidOptions();
            options.mainPathSize = -1;
            let result = validator.validate(options);
            this.assert(false === result, 'Negative mainPathSize should return false');
            this.assertEqual(validator.lastError, 'Invalid negative mainPathSize: -1', 'Expected mainPathSize error');
        });
    }

}

module.exports.TestOptionsValidator = TestOptionsValidator;
