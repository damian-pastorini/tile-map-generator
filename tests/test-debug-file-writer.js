/**
 *
 * Reldens - Test Debug File Writer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { DebugHelper } = require('../lib/generator/debug-helper');

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
            Object.assign(generator, overrides);
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

}

module.exports.TestDebugFileWriter = TestDebugFileWriter;
