/**
 *
 * Reldens - Test Generated File Names
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { RandomMapGenerator } = require('../lib/random-map-generator');
const { FileHandler } = require('@reldens/server-utils');

class TestGeneratedFileNames extends BaseMapGeneratorTest
{

    constructor()
    {
        super();
        this.generatedFolder = FileHandler.joinPaths(this.testDataFolder, 'generated-file-names');
    }

    async assertGenerateRejectsOption(optionKey, escapedFileName)
    {
        let escapedFilePath = FileHandler.joinPaths(this.testDataFolder, escapedFileName);
        FileHandler.remove(escapedFilePath);
        FileHandler.remove(this.generatedFolder);
        let config = this.setupMinimalConfig();
        config.generatedFolder = this.generatedFolder;
        config[optionKey] = FileHandler.joinPaths('..', escapedFileName);
        let generator = new RandomMapGenerator(config);
        this.assertEqual(await generator.generate(), false, 'generate must fail for the '+optionKey+' with folders');
        this.assertEqual(
            generator.optionsValidator.lastError,
            'Invalid option "'+optionKey+'", it must be a file name: '+generator[optionKey],
            'the validator must report the '+optionKey+' with folders'
        );
        this.assertEqual(FileHandler.exists(escapedFilePath), false, 'nothing must be written outside the folder');
        this.assertEqual(FileHandler.exists(this.generatedFolder), false, 'the generated folder must not be created');
    }

    async testGenerateRejectsMapNameWithFolders()
    {
        await this.test('generate rejects a map name with folders before writing the map file', async () => {
            await this.assertGenerateRejectsOption('mapName', 'escaped-map-name.json');
        });
    }

    async testGenerateRejectsMapFileNameWithFolders()
    {
        await this.test('generate rejects a map file name with folders before writing the map file', async () => {
            await this.assertGenerateRejectsOption('mapFileName', 'escaped-map-file.json');
        });
    }

    async testGenerateRejectsTileSheetNameWithFolders()
    {
        await this.test('generate rejects a tile sheet name with folders before copying the tile sheet', async () => {
            await this.assertGenerateRejectsOption('tileSheetName', 'escaped-tilesheet.png');
        });
    }

    async testGenerateWritesFilesInGeneratedFolder()
    {
        await this.test('generate writes the map file and the tile sheet inside the generated folder', async () => {
            Math.random = this.seedRandom(99999);
            FileHandler.remove(this.generatedFolder);
            let config = this.setupMinimalConfig();
            config.generatedFolder = this.generatedFolder;
            config.mapName = 'file-names-map';
            let generatedMap = await new RandomMapGenerator(config).generate();
            this.restoreMathRandom();
            this.assertValidMapStructure(generatedMap);
            this.assertDeepEqual(
                FileHandler.fetchFileJson(FileHandler.joinPaths(this.generatedFolder, 'file-names-map.json')),
                generatedMap,
                'the map file must be written in the generated folder'
            );
            this.assert(
                FileHandler.exists(FileHandler.joinPaths(this.generatedFolder, config.tileSheetName)),
                'the tile sheet must be copied in the generated folder'
            );
            FileHandler.remove(this.generatedFolder);
        });
    }

    async testFromElementsProviderRejectsMapNameWithFolders()
    {
        await this.test('fromElementsProvider rejects a map name with folders before writing any file', async () => {
            FileHandler.remove(this.generatedFolder);
            let config = this.setupCompositeConfig();
            config.generatedFolder = this.generatedFolder;
            config.mapName = FileHandler.joinPaths('..', 'escaped-composite');
            let generator = new RandomMapGenerator();
            this.assertEqual(await generator.fromElementsProvider(config), false, 'the map name must fail');
            this.assertEqual(generator.elementsProvider, null, 'the elements provider must not be created');
            this.assertEqual(FileHandler.exists(this.generatedFolder), false, 'no optimized folder must be created');
            this.assertEqual(await generator.generate(), false, 'the generation must fail without the options');
        });
    }

}

module.exports.TestGeneratedFileNames = TestGeneratedFileNames;
