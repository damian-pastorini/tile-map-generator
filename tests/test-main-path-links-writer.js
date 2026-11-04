/**
 *
 * Reldens - Test Main Path Links Writer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MainPathLinksWriter } = require('../lib/generator/main-path-links-writer');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { MainPathEdgesConstants } = require('../lib/constants');

class TestMainPathLinksWriter extends BaseMapGeneratorTest
{

    buildWriter(markedPositions, openedWalls)
    {
        return new MainPathLinksWriter(
            new ReturnPointWriter(),
            {
                markMapGridPosition(mapGrid, y, x, walkable)
                {
                    markedPositions.push({x, y, walkable});
                }
            },
            new LayerDataFactory(),
            {
                openWallsBelowTopBorder(firstColumn, columnsCount, y)
                {
                    openedWalls.push({firstColumn, columnsCount, y});
                    return true;
                }
            }
        );
    }

    buildMapState(isBorderWalkable)
    {
        return {
            mapWidth: 6,
            mapHeight: 6,
            isBorderWalkable,
            borderLayer: Array(36).fill(5),
            mapGrid: [],
            groundTile: 116,
            generatedChangePoints: {},
            generatedReturnPoints: {}
        };
    }

    buildEntryOpening()
    {
        return {
            targetMapName: 'level-1',
            pathIndexes: [{index: 8, x: 2, y: 1}, {index: 9, x: 3, y: 1}, {index: 10, x: 4, y: 1}],
            borderIndexes: [{index: 2, x: 2, y: 0}, {index: 3, x: 3, y: 0}, {index: 4, x: 4, y: 0}],
            edge: MainPathEdgesConstants.TOP,
            isDefault: true
        };
    }

    buildExitOpening()
    {
        return {
            targetMapName: 'level-3',
            pathIndexes: [{index: 16, x: 4, y: 2}, {index: 22, x: 4, y: 3}, {index: 28, x: 4, y: 4}],
            borderIndexes: [{index: 17, x: 5, y: 2}, {index: 23, x: 5, y: 3}, {index: 29, x: 5, y: 4}],
            edge: MainPathEdgesConstants.RIGHT,
            isDefault: false
        };
    }

    async testWriteLinksOpensBorderCellsAndRecordsTheLinks()
    {
        await this.test('writeLinks opens the entry and exit border cells and records both links', async () => {
            let markedPositions = [];
            let openedWalls = [];
            let writer = this.buildWriter(markedPositions, openedWalls);
            let mapState = this.buildMapState(false);
            let result = writer.writeLinks([this.buildEntryOpening(), this.buildExitOpening()], mapState);
            let openedIndexes = [2, 3, 4, 17, 23, 29];
            let expectedLayerData = Array(36).fill(0);
            let expectedBorderLayer = Array(36).fill(5);
            for(let openedIndex of openedIndexes){
                expectedLayerData[openedIndex] = 116;
                expectedBorderLayer[openedIndex] = 0;
            }
            this.assertDeepEqual(result.layerData, expectedLayerData, 'Change point tiles only on the opening cells');
            this.assertDeepEqual(mapState.borderLayer, expectedBorderLayer, 'Opening cells removed from the border');
            this.assertDeepEqual(
                markedPositions,
                [
                    {x: 2, y: 0, walkable: true},
                    {x: 3, y: 0, walkable: true},
                    {x: 4, y: 0, walkable: true},
                    {x: 5, y: 2, walkable: true},
                    {x: 5, y: 3, walkable: true},
                    {x: 5, y: 4, walkable: true}
                ],
                'Every opening cell is marked walkable'
            );
            this.assertDeepEqual(
                openedWalls,
                [{firstColumn: 2, columnsCount: 3, y: 0}],
                'Only the top opening opens the walls below the top border'
            );
            this.assertDeepEqual(
                result.layerProperties,
                [
                    {name: 'change-point-for-level-1', type: 'int', value: 2},
                    {name: 'change-point-for-level-1', type: 'int', value: 3},
                    {name: 'change-point-for-level-1', type: 'int', value: 4},
                    {name: 'return-point-for-level-1', type: 'int', value: 9},
                    {name: 'return-point-x-level-1', type: 'int', value: 3},
                    {name: 'return-point-y-level-1', type: 'int', value: 1},
                    {name: 'return-point-position-level-1', type: 'string', value: 'down'},
                    {name: 'return-point-isDefault-level-1', type: 'bool', value: true},
                    {name: 'change-point-for-level-3', type: 'int', value: 17},
                    {name: 'change-point-for-level-3', type: 'int', value: 23},
                    {name: 'change-point-for-level-3', type: 'int', value: 29},
                    {name: 'return-point-for-level-3', type: 'int', value: 22},
                    {name: 'return-point-x-level-3', type: 'int', value: 4},
                    {name: 'return-point-y-level-3', type: 'int', value: 3},
                    {name: 'return-point-position-level-3', type: 'string', value: 'left'}
                ],
                'Both links write their change points and one return point inside the opening'
            );
            this.assertDeepEqual(
                Object.keys(mapState.generatedReturnPoints),
                ['main-path-link-level-1', 'main-path-link-level-3'],
                'Both return points are recorded'
            );
            this.assertDeepEqual(
                Object.keys(mapState.generatedChangePoints),
                ['main-path-link-level-1', 'main-path-link-level-3'],
                'Both change points are recorded in the links store'
            );
        });
    }

    async testWriteLinksUsesThePathCellsWhenTheBorderIsWalkable()
    {
        await this.test('writeLinks puts the change points on the path cells when the border is walkable', async () => {
            let writer = this.buildWriter([], []);
            let mapState = this.buildMapState(true);
            let opening = this.buildEntryOpening();
            opening.pathIndexes = opening.borderIndexes;
            opening.borderIndexes = [];
            let result = writer.writeLinks([opening], mapState);
            this.assertDeepEqual(
                result.layerProperties.filter(property => 0 === property.name.indexOf('change-point-for-')),
                [
                    {name: 'change-point-for-level-1', type: 'int', value: 2},
                    {name: 'change-point-for-level-1', type: 'int', value: 3},
                    {name: 'change-point-for-level-1', type: 'int', value: 4}
                ],
                'The border row path cells hold the change points'
            );
        });
    }

    async testWriteLinksSkipsAnOpeningWithoutBorderCells()
    {
        await this.test('writeLinks writes nothing for an opening without border cells', async () => {
            let markedPositions = [];
            let writer = this.buildWriter(markedPositions, []);
            let mapState = this.buildMapState(false);
            let opening = this.buildEntryOpening();
            opening.borderIndexes = [];
            let result = writer.writeLinks([opening], mapState);
            this.assertDeepEqual(result.layerProperties, [], 'No link properties');
            this.assertDeepEqual(result.layerData, Array(36).fill(0), 'No change point tiles');
            this.assertDeepEqual(markedPositions, [], 'No grid position is opened');
            this.assertDeepEqual(mapState.generatedReturnPoints, {}, 'No return point recorded');
        });
    }

}

module.exports.TestMainPathLinksWriter = TestMainPathLinksWriter;
