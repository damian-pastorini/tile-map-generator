/**
 *
 * Reldens - Test Options Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { OptionsValidator } = require('../lib/validator/options-validator');
const { FileHandler } = require('@reldens/server-utils');

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

    async testValidFileNamesPass()
    {
        await this.test('Map name, map file name and tile sheet name without folders pass validation', async () => {
            let validator = new OptionsValidator();
            let options = this.buildValidOptions();
            options.mapName = 'town-001';
            options.mapFileName = 'town-001.json';
            let result = validator.validate(options);
            this.assert(true === result, 'File names should return true');
            this.assertEqual(validator.lastError, null, 'No error expected on file names');
        });
    }

    async testFileNamesWithFoldersFail()
    {
        await this.test('Map name, map file name and tile sheet name with folders fail validation', async () => {
            let invalidOptions = {
                mapName: FileHandler.joinPaths('..', 'outside'),
                mapFileName: 'folder/map.json',
                tileSheetName: '/tmp/tilesheet.png'
            };
            for(let optionKey of Object.keys(invalidOptions)){
                let validator = new OptionsValidator();
                let options = this.buildValidOptions();
                options[optionKey] = invalidOptions[optionKey];
                let result = validator.validate(options);
                this.assert(false === result, 'Option with folders should return false: '+optionKey);
                this.assertEqual(
                    validator.lastError,
                    'Invalid option "'+optionKey+'", it must be a file name: '+invalidOptions[optionKey],
                    'Expected file name error for '+optionKey
                );
            }
        });
    }

    async testParentFolderTileSheetNameFails()
    {
        await this.test('Tile sheet name pointing to the parent folder fails validation', async () => {
            let validator = new OptionsValidator();
            let options = this.buildValidOptions();
            options.tileSheetName = '..';
            let result = validator.validate(options);
            this.assert(false === result, 'Parent folder tile sheet name should return false');
            this.assertEqual(
                validator.lastError,
                'Invalid option "tileSheetName", it must be a file name: ..',
                'Expected parent folder error'
            );
        });
    }

    async testNonStringMapNameFails()
    {
        await this.test('Non string map name fails validation', async () => {
            let validator = new OptionsValidator();
            let options = this.buildValidOptions();
            options.mapName = 12;
            let result = validator.validate(options);
            this.assert(false === result, 'Non string map name should return false');
            this.assertEqual(
                validator.lastError,
                'Invalid option "mapName", it must be a file name: 12',
                'Expected non string map name error'
            );
        });
    }

}

module.exports.TestOptionsValidator = TestOptionsValidator;
