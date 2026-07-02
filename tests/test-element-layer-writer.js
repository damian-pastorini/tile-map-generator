/**
 *
 * Reldens - Test Element Layer Writer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementLayerWriter } = require('../lib/generator/element-layer-writer');
const { ElementLayerName } = require('../lib/map/element-layer-name');
const { MapNaming } = require('../lib/map/map-naming');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');
const { TilePositionCalculator } = require('../lib/generator/tile-position-calculator');

class TestElementLayerWriter extends BaseMapGeneratorTest
{

    buildGeneratorStub(overrides)
    {
        let generator = {
            tilePositionCalculator: {},
            elementLayerName: new ElementLayerName(),
            mapNaming: new MapNaming(),
            mapName: 'town-01'
        };
        if(overrides){
            return Object.assign(generator, overrides);
        }
        return generator;
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected methods', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            this.assert(writer instanceof ElementLayerWriter, 'Expected ElementLayerWriter instance');
            this.assert('function' === typeof writer.updateLayerData, 'Expected updateLayerData method');
            this.assert('function' === typeof writer.provideElementKey, 'Expected provideElementKey method');
        });
    }

    async testProvideReturnPositionKeyFromLayerDefault()
    {
        await this.test('provideReturnPositionKeyFromLayer defaults to down', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            this.assertEqual(writer.provideReturnPositionKeyFromLayer(null), 'down');
            this.assertEqual(writer.provideReturnPositionKeyFromLayer({}), 'down');
        });
    }

    async testProvideReturnPositionKeyFromLayerProperty()
    {
        await this.test('provideReturnPositionKeyFromLayer reads position property', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            let layer = {properties: [{name: 'position', value: 'up'}]};
            this.assertEqual(writer.provideReturnPositionKeyFromLayer(layer), 'up');
        });
    }

    async testRemoveFloorFromMapNamePlain()
    {
        await this.test('removeFloorFromMapName keeps plain map name', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub({mapName: 'town-01'}));
            this.assertEqual(writer.removeFloorFromMapName(), 'town-01');
        });
    }

    async testRemoveFloorFromMapNameUpper()
    {
        await this.test('removeFloorFromMapName strips upper floor suffix', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub({mapName: 'town-01-upperFloor-n2'}));
            this.assertEqual(writer.removeFloorFromMapName(), 'town-01');
        });
    }

    async testRemoveFloorFromMapNameDown()
    {
        await this.test('removeFloorFromMapName strips down floor suffix', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub({mapName: 'town-01-downFloor-n1'}));
            this.assertEqual(writer.removeFloorFromMapName(), 'town-01');
        });
    }

    async testProvideElementKeyNonStairs()
    {
        await this.test('provideElementKey builds non-stairs key', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            let elementData = {name: 'house-change-points'};
            let key = writer.provideElementKey('town-01', elementData, 2, 0, '');
            this.assertEqual(key, 'town-01-house-n2');
        });
    }

    buildFullWriterGenerator(initialLayers)
    {
        let generator = {
            mapWidth: 4,
            mapHeight: 4,
            mapName: 'town-01',
            additionalLayers: initialLayers,
            generatedChangePoints: {},
            generatedReturnPoints: {},
            pathTile: 121,
            pathLayerData: Array(16).fill(0),
            pathLayerProperties: [],
            temporalBlockedPositionsToAvoidElements: [],
            temporalBlockedPositionsToAvoidElementsList: [],
            allowPlacePathOverElementsFreeArea: false,
            mapGrid: Array.from({length: 4}, () => Array(4).fill(true)),
            mapNaming: new MapNaming(),
            returnPointWriter: new ReturnPointWriter(),
            elementLayerName: new ElementLayerName(),
            generateLayerWithData: (name, data) => {
                return {name, data};
            },
            fetchMapProperty: (propertyName) => {
                return {value: 'currentFloor' === propertyName ? 0 : ''};
            },
            mapGridBuilder: {
                markMapGridPosition: (grid, gridY, gridX, value) => {
                    this.assignGridCell(grid, gridY, gridX, value);
                }
            }
        };
        generator.tilePositionCalculator = new TilePositionCalculator(generator);
        return generator;
    }

    assignGridCell(grid, gridY, gridX, value)
    {
        if(!grid[gridY]){
            return;
        }
        if(0 > gridX || gridX >= grid[gridY].length){
            return;
        }
        grid[gridY][gridX] = value;
    }

    async testUpdateLayerDataWritesTiles()
    {
        await this.test('updateLayerData writes element tiles into a per-instance layer', async () => {
            let generator = this.buildFullWriterGenerator([{name: 'tree-below', data: Array(16).fill(0)}]);
            let writer = new ElementLayerWriter(generator);
            let elementData = {
                name: 'tree-below',
                width: 2,
                height: 2,
                position: {x: 1, y: 1},
                data: [5, 0, 0, 6],
                properties: [{name: 'foo', value: 'bar'}],
                allowPathsInFreeSpace: false
            };
            writer.updateLayerData(elementData, 0, {freeSpaceAround: 0}, 'tree');
            let target = generator.additionalLayers.find(layer => 'tree0-below' === layer.name);
            this.assert(target, 'Expected tree0-below layer created');
            this.assertEqual(target.data[5], 5);
            this.assertEqual(target.data[10], 6);
            this.assertEqual(generator.mapGrid[1][1], false);
            this.assertEqual(generator.mapGrid[2][2], false);
        });
    }

    async testUpdateLayerDataChangePoints()
    {
        await this.test('updateLayerData records change points for change-points layers', async () => {
            let generator = this.buildFullWriterGenerator([{name: 'tree-change-points', data: Array(16).fill(0)}]);
            let writer = new ElementLayerWriter(generator);
            let elementData = {
                name: 'tree-change-points',
                width: 1,
                height: 1,
                position: {x: 1, y: 1},
                data: [7],
                properties: [],
                allowPathsInFreeSpace: false
            };
            writer.updateLayerData(elementData, 0, {freeSpaceAround: 0}, 'tree');
            this.assert(generator.generatedChangePoints['town-01-tree-n0'], 'Expected change point recorded');
        });
    }

    async testUpdateLayerDataReturnPoints()
    {
        await this.test('updateLayerData records return points for return-point layers', async () => {
            let generator = this.buildFullWriterGenerator([{name: 'tree-return-point', data: Array(16).fill(0)}]);
            let writer = new ElementLayerWriter(generator);
            let elementData = {
                name: 'tree-return-point',
                width: 2,
                height: 1,
                position: {x: 1, y: 1},
                data: [0, 8],
                properties: [],
                allowPathsInFreeSpace: false
            };
            writer.updateLayerData(elementData, 0, {freeSpaceAround: 0}, 'tree');
            this.assert(generator.generatedReturnPoints['town-01-tree-n0'], 'Expected return point recorded');
        });
    }

    async testMarkFreeSpaceAroundElementAsNotAvailable()
    {
        await this.test('markFreeSpaceAroundElementAsNotAvailable blocks diagonal free-space cells', async () => {
            let generator = this.buildFullWriterGenerator([]);
            let writer = new ElementLayerWriter(generator);
            writer.markFreeSpaceAroundElementAsNotAvailable(1, 2, 2, 'tree-below', false);
            this.assertEqual(generator.mapGrid[1][1], false);
            this.assertEqual(generator.mapGrid[3][3], false);
            this.assertEqual(generator.temporalBlockedPositionsToAvoidElements.length, 1);
            this.assert(-1 !== generator.temporalBlockedPositionsToAvoidElementsList.indexOf('2/2'), 'Expected saved key');
        });
    }

    async testMarkFreeSpaceAroundSkipsPathTile()
    {
        await this.test('markFreeSpaceAroundElementAsNotAvailable skips when standing on a path tile', async () => {
            let generator = this.buildFullWriterGenerator([]);
            generator.pathLayerData[2 * 4 + 2] = 121;
            let writer = new ElementLayerWriter(generator);
            writer.markFreeSpaceAroundElementAsNotAvailable(1, 2, 2, 'tree-below', false);
            this.assertEqual(generator.temporalBlockedPositionsToAvoidElements.length, 0);
        });
    }

    async testProvideElementKeyStairs()
    {
        await this.test('provideElementKey builds stairs upper-floor key on ground floor', async () => {
            let writer = new ElementLayerWriter(this.buildGeneratorStub());
            let key = writer.provideElementKey('town-01', {name: 'stairs-up-change-points'}, 0, 0, '');
            this.assertEqual(key, 'town-01-upperFloor-n1');
        });
    }

}

module.exports.TestElementLayerWriter = TestElementLayerWriter;
