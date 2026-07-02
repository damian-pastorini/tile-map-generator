/**
 *
 * Reldens - Test Debug File Writer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { DebugHelper } = require('../lib/generator/debug-helper');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { FileHandler } = require('@reldens/server-utils');

class TestDebugFileWriter extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            debugPathsGrid: false,
            shouldDebugAdjacentSpots: false,
            generatedFolder: this.testDataFolder,
            mapFileName: 'debug-map.json'
        };
        if(overrides){
            for(let overrideKey of Object.keys(overrides)){
                generator[overrideKey] = overrides[overrideKey];
            }
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let helper = new DebugHelper(this.buildGeneratorStub());
            this.assert(helper instanceof DebugHelper, 'Expected DebugHelper instance');
            this.assert('function' === typeof helper.writeDebugPathFinderFile, 'Expected writeDebugPathFinderFile method');
            this.assert('function' === typeof helper.debugAdjacentSpots, 'Expected debugAdjacentSpots method');
        });
    }

    async testDebugAdjacentSpotsDisabledReturns()
    {
        await this.test('debugAdjacentSpots returns early when disabled', async () => {
            let helper = new DebugHelper(this.buildGeneratorStub({shouldDebugAdjacentSpots: false}));
            let result = await helper.debugAdjacentSpots({x: 0, y: 0}, {width: 1, height: 1}, 0, 4, 4);
            this.assert(!result, 'Expected no result when adjacent spots debug disabled');
        });
    }

    async testWriteDebugPathFinderFileDisabledReturns()
    {
        await this.test('writeDebugPathFinderFile returns early when paths grid disabled', async () => {
            let helper = new DebugHelper(this.buildGeneratorStub({debugPathsGrid: false}));
            let result = await helper.writeDebugPathFinderFile([], 'test-', {0: 1});
            this.assert(!result, 'Expected no result when debug paths grid disabled');
        });
    }

    async testWriteDebugPathFinderFileDisabledFalsyDataDoesNotWrite()
    {
        await this.test('writeDebugPathFinderFile writes nothing when disabled and path connection left no debug data', async () => {
            let overrides = Object.assign({
                debugPathsGrid: false,
                generatedFolder: this.testDataFolder,
                mapFileName: 'pf-guard-map.json'
            }, this.buildLayerStubs());
            let helper = new DebugHelper(this.buildGeneratorStub(overrides));
            await helper.writeDebugPathFinderFile([{name: 'ground', data: [0, 0]}], 'pf-guard-', false);
            let filePath = FileHandler.joinPaths(this.testDataFolder, 'pf-guard-pf-guard-map.json');
            this.assert(!FileHandler.exists(filePath), 'No debug file must be written when debugPathsGrid is off');
        });
    }

    async testWriteDebugPathFinderFileEnabledFalsyDataDoesNotWrite()
    {
        await this.test('writeDebugPathFinderFile skips the file when enabled but there is no debug data', async () => {
            let overrides = Object.assign({
                debugPathsGrid: true,
                generatedFolder: this.testDataFolder,
                mapFileName: 'pf-nodata-map.json'
            }, this.buildLayerStubs());
            let helper = new DebugHelper(this.buildGeneratorStub(overrides));
            await helper.writeDebugPathFinderFile([{name: 'ground', data: [0, 0]}], 'pf-nodata-', false);
            let filePath = FileHandler.joinPaths(this.testDataFolder, 'pf-nodata-pf-nodata-map.json');
            this.assert(!FileHandler.exists(filePath), 'No debug file must be written without debug layer data');
        });
    }

    buildLayerStubs()
    {
        return {
            generateLayerWithData: (name, data) => {
                return {name, data};
            },
            createTiledMapObject: (layers, width, height) => {
                return {type: 'map', layers, width, height};
            }
        };
    }

    async testWriteDebugFile()
    {
        await this.test('writeDebugFile writes a Tiled JSON file to disk', async () => {
            let overrides = Object.assign({
                generatedFolder: this.testDataFolder,
                mapFileName: 'unit-debug-map.json'
            }, this.buildLayerStubs());
            let helper = new DebugHelper(this.buildGeneratorStub(overrides));
            await helper.writeDebugFile([{name: 'sample', data: [0, 1, 0, 0]}], 'unit-test-');
            let filePath = FileHandler.joinPaths(this.testDataFolder, 'unit-test-unit-debug-map.json');
            this.assert(FileHandler.exists(filePath), 'Expected debug file written');
            FileHandler.remove(filePath);
        });
    }

    async testWriteDebugPathFinderFileWritesFile()
    {
        await this.test('writeDebugPathFinderFile writes a collisions debug file when enabled', async () => {
            let overrides = Object.assign({
                debugPathsGrid: true,
                generatedFolder: this.testDataFolder,
                mapFileName: 'pf-debug-map.json'
            }, this.buildLayerStubs());
            let helper = new DebugHelper(this.buildGeneratorStub(overrides));
            let layers = [{name: 'ground', data: [0, 0]}, {name: 'ground-variations', data: [1, 1]}];
            await helper.writeDebugPathFinderFile(layers, 'pf-test-', {0: 1, 1: 2});
            let filePath = FileHandler.joinPaths(this.testDataFolder, 'pf-test-pf-debug-map.json');
            this.assert(FileHandler.exists(filePath), 'Expected pathfinder debug file written');
            FileHandler.remove(filePath);
        });
    }

    async testDebugAdjacentSpotsWritesFile()
    {
        await this.test('debugAdjacentSpots writes a centered-elements debug file when enabled', async () => {
            let overrides = Object.assign({
                shouldDebugAdjacentSpots: true,
                generatedFolder: this.testDataFolder,
                mapFileName: 'adj-debug-map.json',
                layerDataFactory: new LayerDataFactory(),
                geometryCalculator: new GeometryCalculator()
            }, this.buildLayerStubs());
            let helper = new DebugHelper(this.buildGeneratorStub(overrides));
            await helper.debugAdjacentSpots({x: 1, y: 1}, {width: 2, height: 2}, 1, 8, 8);
            let filePath = FileHandler.joinPaths(
                this.testDataFolder,
                'test-centered-elements-and-adjacent-spots-adj-debug-map.json'
            );
            this.assert(FileHandler.exists(filePath), 'Expected adjacent spots debug file written');
            FileHandler.remove(filePath);
        });
    }

}

module.exports.TestDebugFileWriter = TestDebugFileWriter;
