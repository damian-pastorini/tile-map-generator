/**
 *
 * Reldens - Base Map Generator Test
 *
 */

const { RandomMapGenerator } = require('../lib/random-map-generator');
const { GeneratedFoldersConstants } = require('../lib/constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class BaseMapGeneratorTest
{

    constructor()
    {
        this.testResults = [];
        this.testCount = 0;
        this.passedCount = 0;
        this.originalMathRandom = Math.random;
        this.testDataFolder = FileHandler.joinPaths(__dirname, 'test-data');
        this.currentTestMethod = '';
        this.currentMapName = '';
        this.currentSeed = null;
        this.setupTestData();
    }

    setupTestData()
    {
        let examplesPath = FileHandler.joinPaths(__dirname, '..', 'examples', 'layer-elements-object');
        if(!FileHandler.exists(this.testDataFolder)){
            FileHandler.createFolder(this.testDataFolder);
        }
        let filesToCopy = ['house-001.json', 'house-002.json', 'tree.json', 'tilesheet.png', 'map-data.json'];
        for(let fileName of filesToCopy){
            let sourcePath = FileHandler.joinPaths(examplesPath, fileName);
            let targetPath = FileHandler.joinPaths(this.testDataFolder, fileName);
            if(FileHandler.exists(sourcePath) && !FileHandler.exists(targetPath)){
                FileHandler.copyFile(sourcePath, targetPath);
            }
        }
        let compositePath = FileHandler.joinPaths(__dirname, '..', 'examples', 'layer-elements-composite');
        let compositeFiles = [
            'reldens-town-composite.json',
            'reldens-town-composite-with-associations.json',
            'house-composite.json',
            'reldens-dungeon-composite.json',
            'terrain.png',
            'house.png',
            'doors.png',
            'inside.png',
            'outside.png',
            'water.png',
            'map-composite-data.json',
            'map-composite-data-with-names.json',
            'map-composite-data-with-associations.json',
            'map-composite-data-dungeon.json'
        ];
        for(let fileName of compositeFiles){
            let sourcePath = FileHandler.joinPaths(compositePath, fileName);
            let targetPath = FileHandler.joinPaths(this.testDataFolder, fileName);
            if(FileHandler.exists(sourcePath) && !FileHandler.exists(targetPath)){
                FileHandler.copyFile(sourcePath, targetPath);
            }
        }
    }

    async test(name, testFn)
    {
        this.testCount++;
        try {
            await testFn();
            let logMessage = this.generateLogMessage('✓ PASS: ', name);
            Logger.log(100, '', logMessage);
            this.passedCount++;
            this.testResults.push({
                name,
                status: 'PASS',
                method: this.currentTestMethod,
                seed: this.currentSeed,
                mapName: this.currentMapName
            });
        } catch(error){
            let logMessage = this.generateLogMessage('✗ FAIL: ', name);
            logMessage += ' - '+error.message;
            Logger.log(100, '', logMessage);
            this.testResults.push({
                name,
                status: 'FAIL',
                error: error.message,
                method: this.currentTestMethod,
                seed: this.currentSeed,
                mapName: this.currentMapName
            });
        }
    }

    generateLogMessage(prefix, name)
    {
        let logMessage = prefix + name;
        if(this.currentTestMethod){
            logMessage += ' (' + this.currentTestMethod;
            if (this.currentSeed) {
                logMessage += ', seed: ' + this.currentSeed;
            }
            if (this.currentMapName) {
                logMessage += ' - ' + this.currentMapName;
            }
            logMessage += ')';
        }
        return logMessage;
    }

    assert(condition, message)
    {
        if(!condition){
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message)
    {
        if(actual !== expected){
            throw new Error(message || 'Expected '+expected+' but got '+actual);
        }
    }

    assertDeepEqual(actual, expected, message)
    {
        let actualStr = JSON.stringify(actual);
        let expectedStr = JSON.stringify(expected);
        if(actualStr !== expectedStr){
            throw new Error(message || 'Deep equality failed');
        }
    }

    assertOptimizedFolderCleaned(generatedFolder)
    {
        let optimizedFolder = FileHandler.joinPaths(generatedFolder, GeneratedFoldersConstants.OPTIMIZED_SUB_FOLDER);
        this.assert(
            !FileHandler.exists(optimizedFolder),
            'The optimizer intermediates folder must be fully cleaned after generation'
        );
    }

    async testCurrentGeneration(config)
    {
        if(config.tileMapJSON){
            let generator = new RandomMapGenerator();
            await generator.fromElementsProvider(config);
            return await generator.generate();
        }
        let generator = new RandomMapGenerator(config);
        return await generator.generate();
    }

    seedRandom(seed)
    {
        let value = seed;
        return () => {
            value = (value * 9301 + 49297) % 233280;
            return value / 233280;
        };
    }

    restoreMathRandom()
    {
        Math.random = this.originalMathRandom;
    }

    setupWallsCompositeConfig(mapName, overrides)
    {
        let config = {
            tileMapJSON: FileHandler.fetchFileJson(
                FileHandler.joinPaths(this.testDataFolder, 'house-composite.json')
            ),
            rootFolder: this.testDataFolder,
            factor: 1,
            mapName,
            mapFileName: mapName+'.json',
            mapSize: {mapWidth: 20, mapHeight: 20},
            blockMapBorder: true,
            applyMapBorderInnerWalls: true
        };
        return Object.assign(config, overrides);
    }

    setupBasicConfig()
    {
        let house1Path = FileHandler.joinPaths(this.testDataFolder, 'house-001.json');
        let treePath = FileHandler.joinPaths(this.testDataFolder, 'tree.json');
        let layerElements = {
            house1: JSON.parse(FileHandler.readFile(house1Path)).layers,
            tree: JSON.parse(FileHandler.readFile(treePath)).layers
        };
        return {
            rootFolder: this.testDataFolder,
            tileSize: 32,
            tileSheetPath: 'tilesheet.png',
            tileSheetName: 'tilesheet.png',
            imageHeight: 578,
            imageWidth: 612,
            tileCount: 306,
            columns: 18,
            margin: 1,
            spacing: 2,
            layerElements,
            elementsQuantity: {house1: 1, tree: 1},
            elementsFreeSpaceAround: {house1: 1, tree: 1},
            groundTile: 116,
            pathTile: 121,
            mainPathSize: 3,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 2,
            surroundingTiles: {
                '-1,-1': 127, '-1,0': 124, '-1,1': 130,
                '0,-1': 126, '0,1': 129,
                '1,-1': 132, '1,0': 131, '1,1': 133
            },
            corners: {
                '-1,-1': 285, '-1,1': 284, '1,-1': 283, '1,1': 282
            }
        };
    }

    setupComplexConfig()
    {
        let config = this.setupBasicConfig();
        let house2Path = FileHandler.joinPaths(this.testDataFolder, 'house-002.json');
        config.layerElements.house2 = JSON.parse(FileHandler.readFile(house2Path)).layers;
        config.elementsQuantity = {house1: 1, house2: 1, tree: 2};
        config.mainPathSize = 2;
        config.blockMapBorder = true;
        config.freeSpaceTilesQuantity = 5;
        config.variableTilesPercentage = 10;
        config.randomGroundTiles = [26, 27, 28, 29, 30];
        return config;
    }

    setupCompositeConfig()
    {
        let testDataFolder = FileHandler.joinPaths(__dirname, 'test-data');
        let compositePath = FileHandler.joinPaths(testDataFolder, 'reldens-town-composite.json');
        if(!FileHandler.exists(compositePath)){
            return this.setupBasicConfig();
        }
        let tileMapJSON = JSON.parse(FileHandler.readFile(compositePath));
        return {
            tileMapJSON,
            rootFolder: testDataFolder,
            factor: 1,
            elementsQuantity: {'house-01': 1, 'tree-base': 1}
        };
    }

    setupMinimalConfig()
    {
        let treePath = FileHandler.joinPaths(this.testDataFolder, 'tree.json');
        let layerElements = {
            tree: JSON.parse(FileHandler.readFile(treePath)).layers
        };
        return {
            rootFolder: this.testDataFolder,
            tileSize: 32,
            tileSheetPath: 'tilesheet.png',
            tileSheetName: 'tilesheet.png',
            imageHeight: 578,
            imageWidth: 612,
            tileCount: 306,
            columns: 18,
            margin: 1,
            spacing: 2,
            layerElements,
            elementsQuantity: {tree: 1},
            elementsFreeSpaceAround: {tree: 1},
            groundTile: 116,
            pathTile: 121,
            surroundingTiles: {
                '-1,-1': 127, '-1,0': 124, '-1,1': 130,
                '0,-1': 126, '0,1': 129,
                '1,-1': 132, '1,0': 131, '1,1': 133
            },
            corners: {
                '-1,-1': 285, '-1,1': 284, '1,-1': 283, '1,1': 282
            }
        };
    }

    assertValidMapStructure(map)
    {
        this.assert(map, 'Map should exist');
        this.assert(map.type === 'map', 'Map should have type "map"');
        this.assert(map.width > 0, 'Map should have positive width');
        this.assert(map.height > 0, 'Map should have positive height');
        this.assert(Array.isArray(map.layers), 'Map should have layers array');
        this.assert(map.layers.length > 0, 'Map should have at least one layer');
        this.assert(Array.isArray(map.tilesets), 'Map should have tilesets array');
        this.assert(map.tilesets.length > 0, 'Map should have at least one tileset');
        for(let layer of map.layers){
            this.assertValidLayer(layer, map.width, map.height);
        }
    }

    assertValidLayer(layer, expectedWidth, expectedHeight)
    {
        this.assert(layer.name, 'Layer should have name');
        this.assert(layer.type === 'tilelayer', 'Layer should be tilelayer type');
        this.assertEqual(layer.width, expectedWidth, 'Layer width should match map width');
        this.assertEqual(layer.height, expectedHeight, 'Layer height should match map height');
        this.assert(Array.isArray(layer.data), 'Layer should have data array');
        this.assertEqual(layer.data.length, expectedWidth * expectedHeight, 'Layer data should match expected size');
        for(let tile of layer.data){
            this.assert(typeof tile === 'number', 'All tiles should be numbers');
            this.assert(tile >= 0, 'All tiles should be non-negative');
        }
    }

    compareMapOutputs(expected, actual)
    {
        this.assertEqual(actual.width, expected.width, 'Map widths should match');
        this.assertEqual(actual.height, expected.height, 'Map heights should match');
        this.assertEqual(actual.layers.length, expected.layers.length, 'Layer counts should match');
        for(let i = 0; i < expected.layers.length; i++){
            let expectedLayer = expected.layers[i];
            let actualLayer = actual.layers[i];
            this.assertEqual(actualLayer.name, expectedLayer.name, 'Layer names should match');
            this.assertDeepEqual(actualLayer.data, expectedLayer.data, 'Layer data should match exactly');
        }
    }

    validateElementPlacement(map, config)
    {
        if(!config.elementsQuantity || 0 === Object.keys(config.elementsQuantity).length){
            return;
        }
        let elementCount = Object.values(config.elementsQuantity).reduce((sum, count) => sum + count, 0);
        if(0 === elementCount){
            return;
        }
        let nonGroundLayers = map.layers.filter(layer =>
            layer.name !== 'ground' &&
            layer.name !== 'path' &&
            layer.name !== 'collisions-map-border'
        );
        this.assert(nonGroundLayers.length > 0, 'Should have element layers when elements are configured');
    }

    validatePathConnectivity(map, config)
    {
        if(!config.mainPathSize){
            return;
        }
        let pathLayer = map.layers.find(layer => layer.name === 'path');
        if(!pathLayer){
            return;
        }
        let pathTiles = pathLayer.data.filter(tile => tile > 0);
        this.assert(pathTiles.length > 0, 'Should have path tiles when mainPathSize is configured');
    }

    validateLayerIntegrity(map, config)
    {
        for(let layer of map.layers){
            let nullTiles = layer.data.filter(tile => tile === null || tile === undefined);
            this.assertEqual(nullTiles.length, 0, 'Should not have null tiles in layer '+layer.name);
        }
    }

    async runAllTests()
    {
        Logger.log(100, '', 'Running tests for '+this.constructor.name);
        let methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        let testMethods = methodNames.filter(name =>
            name.startsWith('test') && 'function' === typeof this[name] && name !== 'test'
        );
        for(let methodName of testMethods){
            this.currentTestMethod = methodName;
            this.currentSeed = null;
            await this[methodName]();
        }
        this.logUnifiedSummary();
    }

    logUnifiedSummary()
    {
        Logger.log(100, '', 'Tests run: '+this.testCount);
        Logger.log(100, '', 'Passed: '+this.passedCount);
        Logger.log(100, '', 'Failed: '+(this.testCount - this.passedCount));
        this.restoreMathRandom();
    }

}

module.exports.BaseMapGeneratorTest = BaseMapGeneratorTest;
