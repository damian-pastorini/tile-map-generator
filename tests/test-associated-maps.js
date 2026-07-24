/**
 *
 * Reldens - Test Associated Maps
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { AssociatedMaps } = require('../lib/generator/associated-maps');
const { RandomMapGenerator } = require('../lib/random-map-generator');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestAssociatedMaps extends BaseMapGeneratorTest
{

    constructor()
    {
        super();
        this.examplesCompositeFolder = FileHandler.joinPaths(
            this.testDataFolder,
            '..',
            '..',
            'examples',
            'layer-elements-composite'
        );
    }

    buildTownConfig(generatedFolder, mapName)
    {
        let dataFile = FileHandler.joinPaths(this.examplesCompositeFolder, 'map-composite-data-with-associations.json');
        let data = FileHandler.fetchFileJson(dataFile);
        let tileMapJSON = FileHandler.fetchFileJson(
            FileHandler.joinPaths(this.examplesCompositeFolder, data.compositeElementsFile)
        );
        let associationsProperties = data.associationsProperties;
        delete data.mapsInformation;
        delete data.associationsProperties;
        delete data.compositeElementsFile;
        return {
            config: Object.assign(
                {},
                data,
                {tileMapJSON, rootFolder: this.examplesCompositeFolder, generatedFolder, mapName}
            ),
            associationsProperties
        };
    }

    async generateRealTown(generatedFolder, mapName)
    {
        let built = this.buildTownConfig(generatedFolder, mapName);
        let mainGenerator = new RandomMapGenerator();
        mainGenerator.addMapProperty('mapTitle', 'string', 'Town 1');
        await mainGenerator.fromElementsProvider(built.config);
        return {
            mainGenerator,
            townMap: await mainGenerator.generate(),
            associationsProperties: built.associationsProperties
        };
    }

    fetchPathFinderGridFiles(generatedFolder)
    {
        if(!FileHandler.exists(generatedFolder)){
            return [];
        }
        let files = FileHandler.readFolder(generatedFolder);
        if(!sc.isArray(files)){
            return [];
        }
        return files.filter(fileName => 0 === fileName.indexOf('test-path-finding-grid-'));
    }

    cleanPathFinderGridFiles(generatedFolder)
    {
        for(let fileName of this.fetchPathFinderGridFiles(generatedFolder)){
            FileHandler.remove(FileHandler.joinPaths(generatedFolder, fileName));
        }
    }

    async testGenerateBuildsAssociatedInteriorsFromRealTown()
    {
        let generatedFolder = FileHandler.joinPaths(this.testDataFolder, 'generated-assoc');
        await this.test('generate runs the real association flow and produces interior sub-maps from matched doors', async () => {
            Math.random = this.seedRandom(24680);
            try {
                this.cleanPathFinderGridFiles(generatedFolder);
                let town = await this.generateRealTown(generatedFolder, 'town-001');
                this.assertValidMapStructure(town.townMap);
                let changePointKeys = Object.keys(town.mainGenerator.generatedChangePoints);
                this.assert(0 < changePointKeys.length, 'The real town generation must record change-points for the doors');
                let associatedMaps = new AssociatedMaps();
                let result = await associatedMaps.generate(
                    town.townMap,
                    'town-001',
                    this.examplesCompositeFolder,
                    town.associationsProperties,
                    town.mainGenerator
                );
                this.assert(false !== result, 'generate must not early-return false when doors are matched');
                this.assert(sc.isObject(result), 'generate must return the generated sub-maps object');
                let subMapNames = Object.keys(result);
                this.assert(0 < subMapNames.length, 'At least one interior sub-map must be generated from the matched doors');
                let generatorKeys = Object.keys(associatedMaps.generators);
                this.assert(0 < generatorKeys.length, 'A sub-map generator must be created per matched door');
                let hasHouseInterior = subMapNames.some(name => -1 !== name.indexOf('house'));
                this.assert(hasHouseInterior, 'Interior names must derive from the fused house change-points layer names');
                for(let subMapName of subMapNames){
                    this.assertValidMapStructure(result[subMapName]);
                }
                let strayDebugFiles = this.fetchPathFinderGridFiles(generatedFolder);
                this.assertEqual(
                    strayDebugFiles.length,
                    0,
                    'No path-finder debug grid files must be written when debugPathsGrid is off'
                );
                this.assertOptimizedFolderCleaned(generatedFolder);
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testGenerateReturnsFalseOnMissingConfig()
    {
        await this.test('generate guards against missing map json, name and config', async () => {
            let associatedMaps = new AssociatedMaps();
            let stub = {generatedChangePoints: {}, mappedMapDataFromProvider: {}, fetchMapProperty: () => false};
            let missingJson = await associatedMaps.generate(false, 'town', this.testDataFolder, {a: 1}, stub);
            this.assertEqual(missingJson, false, 'Missing map json must return false');
            let missingName = await associatedMaps.generate({layers: []}, '', this.testDataFolder, {a: 1}, stub);
            this.assertEqual(missingName, false, 'Missing map name must return false');
            let missingConfig = await associatedMaps.generate({layers: []}, 'town', this.testDataFolder, {}, stub);
            this.assertEqual(missingConfig, false, 'Empty associated maps config must return false');
            let dryRun = await associatedMaps.generate({layers: []}, 'town', this.testDataFolder, {dryRun: true}, stub);
            this.assertEqual(dryRun, false, 'A dry-run config must return false');
        });
    }

    async testGenerateReturnsFalseWithoutChangePoints()
    {
        await this.test('generate returns false when the main generator recorded no change-points', async () => {
            let associatedMaps = new AssociatedMaps();
            let stub = {generatedChangePoints: {}, mappedMapDataFromProvider: {}, fetchMapProperty: () => false};
            let result = await associatedMaps.generate({layers: []}, 'town', this.testDataFolder, {a: 1}, stub);
            this.assertEqual(result, false, 'No change-points must short-circuit to false');
        });
    }

    async testLoadTileMapJSONLoadsRealComposite()
    {
        await this.test('loadTileMapJSON parses a real composite file referenced by compositeFileNames', async () => {
            let associatedMaps = new AssociatedMaps();
            let loaded = associatedMaps.loadTileMapJSON(
                this.examplesCompositeFolder,
                {compositeFileNames: 'house-composite'}
            );
            this.assert(sc.isObject(loaded), 'loadTileMapJSON must return the parsed composite object');
            this.assert(sc.isArray(loaded.layers), 'The loaded composite must expose its layers array');
            this.assert(0 < loaded.layers.length, 'The loaded composite must contain layers');
        });
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let associatedMaps = new AssociatedMaps();
            this.assert(associatedMaps instanceof AssociatedMaps, 'Expected AssociatedMaps instance');
            this.assert('function' === typeof associatedMaps.generate, 'Expected generate method');
            this.assertDeepEqual(associatedMaps.generators, {});
            this.assertDeepEqual(associatedMaps.generatedSubMaps, {});
        });
    }

    async testFetchPropertiesFromLayerEmpty()
    {
        await this.test('fetchPropertiesFromLayer returns empty object without properties', async () => {
            let associatedMaps = new AssociatedMaps();
            this.assertDeepEqual(associatedMaps.fetchPropertiesFromLayer({}), {});
        });
    }

    async testFetchPropertiesFromLayerMapped()
    {
        await this.test('fetchPropertiesFromLayer maps name to value pairs', async () => {
            let associatedMaps = new AssociatedMaps();
            let layer = {properties: [
                {name: 'subMapName', value: 'cave'},
                {name: 'downFloors', value: 2}
            ]};
            let mapped = associatedMaps.fetchPropertiesFromLayer(layer);
            this.assertEqual(mapped.subMapName, 'cave');
            this.assertEqual(mapped.downFloors, 2);
        });
    }

    async testGenerateSubMapNameFromProperty()
    {
        await this.test('generateSubMapName uses subMapName property when present', async () => {
            let associatedMaps = new AssociatedMaps();
            let layer = {name: 'house-001-change-points'};
            let name = associatedMaps.generateSubMapName(
                layer,
                {subMapName: 'cave'},
                'town-01',
                {elementNumber: 3}
            );
            this.assertEqual(name, 'town-01-cave-n3');
        });
    }

    async testGenerateSubMapNameFromLayerName()
    {
        await this.test('generateSubMapName fuses layer name parts when no property', async () => {
            let associatedMaps = new AssociatedMaps();
            let layer = {name: 'house-001-change-points'};
            let name = associatedMaps.generateSubMapName(layer, {}, 'town-01', {elementNumber: 1});
            this.assertEqual(name, 'town-01-house-001-n1');
        });
    }

    async testFetchSubMapTitleCombination()
    {
        await this.test('fetchSubMapTitle combines map title, element title and number', async () => {
            let associatedMaps = new AssociatedMaps();
            let mainMapGenerator = {fetchMapProperty: () => ({value: 'Town'})};
            let title = associatedMaps.fetchSubMapTitle(
                mainMapGenerator,
                {elementTitle: 'House'},
                {elementNumber: 2}
            );
            this.assertEqual(title, 'Town - House-2');
        });
    }

    async testFetchSubMapTitleEmpty()
    {
        await this.test('fetchSubMapTitle returns empty when nothing provided', async () => {
            let associatedMaps = new AssociatedMaps();
            let mainMapGenerator = {fetchMapProperty: () => ({value: ''})};
            let title = associatedMaps.fetchSubMapTitle(mainMapGenerator, {}, {});
            this.assertEqual(title, '');
        });
    }

    async testLoadTileMapJSONMissingReturnsFalse()
    {
        await this.test('loadTileMapJSON returns false for missing composite file', async () => {
            let associatedMaps = new AssociatedMaps();
            let result = associatedMaps.loadTileMapJSON(
                this.testDataFolder,
                {compositeFileNames: 'non-existent-composite-file'}
            );
            this.assertEqual(result, false);
        });
    }

}

module.exports.TestAssociatedMaps = TestAssociatedMaps;
