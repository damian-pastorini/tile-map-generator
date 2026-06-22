/**
 *
 * Reldens - Test Map Border Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapBorderGenerator } = require('../lib/generator/map-border-generator');

class TestMapBorderGenerator extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            blockMapBorder: false,
            mapWidth: 10,
            mapHeight: 8,
            entryPositionSize: 2,
            bordersTiles: {}
        };
        if(overrides){
            Object.assign(generator, overrides);
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let borderGenerator = new MapBorderGenerator(this.buildGeneratorStub());
            this.assert(borderGenerator instanceof MapBorderGenerator, 'Expected MapBorderGenerator instance');
            this.assert('function' === typeof borderGenerator.populateCollisionsMapBorder, 'Expected populateCollisionsMapBorder method');
            this.assert('function' === typeof borderGenerator.determinePositionInMap, 'Expected determinePositionInMap method');
        });
    }

    async testPopulateReturnsFalseWhenNotBlocked()
    {
        await this.test('populateCollisionsMapBorder returns false when border not blocked', async () => {
            let borderGenerator = new MapBorderGenerator(this.buildGeneratorStub({blockMapBorder: false}));
            this.assertEqual(borderGenerator.populateCollisionsMapBorder(), false);
        });
    }

    async testValidateBorderCornersComplete()
    {
        await this.test('validateBorderCorners true when all corners set', async () => {
            let borderGenerator = new MapBorderGenerator(this.buildGeneratorStub({
                bordersTiles: {
                    'top-left': 1,
                    'top-right': 2,
                    'bottom-left': 3,
                    'bottom-right': 4
                }
            }));
            this.assertEqual(borderGenerator.validateBorderCorners(), 4);
        });
    }

    async testValidateBorderCornersMissing()
    {
        await this.test('validateBorderCorners falsy when a top corner is missing', async () => {
            let borderGenerator = new MapBorderGenerator(this.buildGeneratorStub({
                bordersTiles: {'top-left': 1}
            }));
            this.assertEqual(borderGenerator.validateBorderCorners(), false);
        });
    }

    async testDeterminePositionInMapTopMiddle()
    {
        await this.test('determinePositionInMap top middle', async () => {
            let borderGenerator = new MapBorderGenerator(this.buildGeneratorStub({mapWidth: 10, entryPositionSize: 2}));
            let result = borderGenerator.determinePositionInMap('top', 'middle');
            this.assertEqual(result.y, 0);
            this.assertEqual(result.yReturn, 1);
            this.assertEqual(result.x, 4);
            this.assertEqual(result.returnPointPosition, 'down');
        });
    }

    async testDeterminePositionInMapDownRight()
    {
        await this.test('determinePositionInMap down right', async () => {
            let borderGenerator = new MapBorderGenerator(this.buildGeneratorStub({
                mapWidth: 10,
                mapHeight: 8,
                entryPositionSize: 2
            }));
            let result = borderGenerator.determinePositionInMap('down', 'right');
            this.assertEqual(result.y, 7);
            this.assertEqual(result.yReturn, 6);
            this.assertEqual(result.x, 7);
            this.assertEqual(result.returnPointPosition, 'up');
        });
    }

    async testDeterminePositionInMapLeft()
    {
        await this.test('determinePositionInMap top left', async () => {
            let borderGenerator = new MapBorderGenerator(this.buildGeneratorStub());
            let result = borderGenerator.determinePositionInMap('top', 'left');
            this.assertEqual(result.x, 1);
            this.assertEqual(result.xReturn, 1);
        });
    }

}

module.exports.TestMapBorderGenerator = TestMapBorderGenerator;
