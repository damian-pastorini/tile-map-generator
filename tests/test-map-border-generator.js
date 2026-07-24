/**
 *
 * Reldens - Test Map Border Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapBorderGenerator } = require('../lib/generator/map-border-generator');
const { MapGridBuilder } = require('../lib/generator/map-grid-builder');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');

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
        if(!overrides){
            return generator;
        }
        Object.assign(generator, overrides);
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

    async testPopulateCollisionsMapBorderActive()
    {
        await this.test('populateCollisionsMapBorder fills the border with the ground tile', async () => {
            let generator = this.buildGeneratorStub({
                blockMapBorder: true,
                mapWidth: 4,
                mapHeight: 4,
                groundTile: 116,
                borderTile: 0,
                bordersTiles: {},
                isBorderWalkable: true,
                entryPosition: ''
            });
            let borderGenerator = new MapBorderGenerator(generator);
            borderGenerator.populateCollisionsMapBorder();
            this.assertEqual(generator.borderLayer.length, 16);
            this.assertEqual(generator.borderLayer[0], 116);
            this.assertEqual(generator.borderLayer[3], 116);
            this.assertEqual(generator.borderLayer[12], 116);
            this.assertEqual(generator.borderLayer[15], 116);
            this.assertEqual(generator.borderLayer[5], 0);
        });
    }

    async testPopulateCollisionsMapBorderWithCorners()
    {
        await this.test('populateCollisionsMapBorder applies corner tiles and blocks the grid', async () => {
            let generator = this.buildGeneratorStub({
                mapWidth: 4,
                mapHeight: 4,
                blockMapBorder: true,
                isBorderWalkable: false,
                groundTile: 116,
                entryPosition: '',
                bordersTiles: {
                    top: 1, bottom: 2, left: 3, right: 4,
                    'top-left': 10, 'top-right': 11, 'bottom-left': 12, 'bottom-right': 13
                },
                mapGrid: Array.from({length: 4}, () => Array(4).fill(true))
            });
            generator.mapGridBuilder = new MapGridBuilder(generator);
            let borderGenerator = new MapBorderGenerator(generator);
            borderGenerator.populateCollisionsMapBorder();
            this.assertEqual(generator.borderLayer[0], 10);
            this.assertEqual(generator.borderLayer[3], 11);
            this.assertEqual(generator.borderLayer[12], 12);
            this.assertEqual(generator.borderLayer[15], 13);
            this.assertEqual(generator.mapGrid[0][0], false);
            this.assertEqual(generator.mapGrid[1][1], true);
        });
    }

    async testCreateEntryPosition()
    {
        await this.test('createEntryPosition opens the border and adds a change-points layer', async () => {
            let generator = this.buildGeneratorStub({
                mapWidth: 10,
                mapHeight: 8,
                entryPosition: 'top-middle',
                entryPositionSize: 2,
                entryPositionFrom: '',
                groundTile: 116,
                borderLayer: Array(80).fill(116),
                additionalLayers: [],
                mapGrid: Array.from({length: 8}, () => Array(10).fill(true)),
                generateLayerWithData: (name, data) => {
                    return {name, data};
                }
            });
            generator.mapGridBuilder = new MapGridBuilder(generator);
            let borderGenerator = new MapBorderGenerator(generator);
            borderGenerator.createEntryPosition();
            this.assertEqual(generator.additionalLayers.length, 1);
            this.assertEqual(generator.additionalLayers[0].name, 'return-to-main-map-change-points');
            this.assertEqual(generator.borderLayer[4], 0);
            this.assertEqual(generator.borderLayer[5], 0);
            this.assertEqual(generator.additionalLayers[0].data[4], 116);
            this.assertEqual(generator.additionalLayers[0].data[5], 116);
        });
    }

    async testApplyEntryPositionFrom()
    {
        await this.test('applyEntryPositionFrom records change and return points', async () => {
            let generator = this.buildGeneratorStub({
                mapWidth: 10,
                mapName: 'town-01',
                groundTile: 116,
                entryPositionFrom: 'overworld',
                generatedChangePoints: {},
                generatedReturnPoints: {},
                returnPointWriter: new ReturnPointWriter()
            });
            let borderGenerator = new MapBorderGenerator(generator);
            let layerProperties = [];
            borderGenerator.applyEntryPositionFrom(layerProperties, 4, 0, 4, 0, 4, 1, 'down');
            this.assert(generator.generatedChangePoints['return-to-main-map'], 'Expected change point recorded');
            this.assert(generator.generatedReturnPoints['town-01'], 'Expected return point recorded');
            this.assert(0 < layerProperties.length, 'Expected properties pushed');
        });
    }

}

module.exports.TestMapBorderGenerator = TestMapBorderGenerator;
