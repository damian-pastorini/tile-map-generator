/**
 *
 * Reldens - Test Main Path Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MainPathGenerator } = require('../lib/generator/main-path-generator');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class TestMainPathGenerator extends BaseMapGeneratorTest
{

    buildGenerator(markedPositions)
    {
        return new MainPathGenerator(null, new ReturnPointWriter(), new LayerDataFactory(), {
            markMapGridPosition(mapGrid, y, x, walkable)
            {
                if(markedPositions){
                    markedPositions.push({x, y, walkable});
                }
            }
        });
    }

    buildWalkableGrid(size)
    {
        let grid = [];
        for(let row = 0; row < size; row++){
            grid.push(new Array(size).fill(true));
        }
        return grid;
    }

    async testGenerateFullMainPathWithIndexes()
    {
        await this.test('generateFullMainPathWithIndexes builds horizontal run on top edge', async () => {
            let generator = this.buildGenerator();
            let result = generator.generateFullMainPathWithIndexes(0, 0, 2, 0, 5, 5, 3);
            this.assertEqual(result.mainPathStart.x, 2, 'Start x set from random start x');
            this.assertEqual(result.mainPathStart.y, 0, 'Start y on top walkable row');
            this.assertEqual(result.generatedPathIndexes.length, 3, 'Three path tiles generated');
            this.assertEqual(result.generatedPathIndexes[0].index, 2, 'First index');
            this.assertEqual(result.generatedPathIndexes[1].index, 3, 'Second index');
            this.assertEqual(result.generatedPathIndexes[2].index, 4, 'Third index');
        });
    }

    async testDetermineReturnPointFromMainPath()
    {
        await this.test('determineReturnPointFromMainPath clamps to non border with blockMapBorder', async () => {
            let generator = this.buildGenerator();
            let indexes = [{x: 2, y: 0, index: 2}, {x: 3, y: 0, index: 3}, {x: 4, y: 0, index: 4}];
            let result = generator.determineReturnPointFromMainPath(indexes, 5, 5, true);
            this.assertEqual(result.returnPointX, 3, 'Return x from second index');
            this.assertEqual(result.returnPointY, 4, 'Return y derived from path on top edge');
            this.assertEqual(result.position, 'down', 'Default position is down');
        });
    }

    async testGenerateOppositeMainPath()
    {
        await this.test('generateOppositeMainPath flips horizontally across the map', async () => {
            let generator = this.buildGenerator();
            let previous = [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}];
            let result = generator.generateOppositeMainPath(previous, 5, 5);
            this.assert(result.hasAssociatedMap, 'Opposite path marks associated map');
            this.assertEqual(result.generatedMainPathIndexes.length, 3, 'Same length as previous');
            this.assertEqual(result.generatedMainPathIndexes[0].x, 4, 'X flipped to opposite edge');
            this.assertEqual(result.generatedMainPathIndexes[0].index, 4, 'First flipped index');
            this.assertEqual(result.generatedMainPathIndexes[1].index, 9, 'Second flipped index');
        });
    }

    async testPlaceAllMainPathIndexes()
    {
        await this.test('placeAllMainPathIndexes writes path tiles and reports success', async () => {
            let marked = [];
            let generator = this.buildGenerator(marked);
            let pathLayerData = new Array(25).fill(0);
            let mapGrid = this.buildWalkableGrid(5);
            let indexes = [{index: 2, x: 2, y: 0}, {index: 3, x: 3, y: 0}];
            let failed = generator.placeAllMainPathIndexes(indexes, pathLayerData, mapGrid, 9);
            this.assertEqual(failed, false, 'Placement did not fail');
            this.assertEqual(pathLayerData[2], 9, 'First path tile written');
            this.assertEqual(pathLayerData[3], 9, 'Second path tile written');
            this.assertEqual(marked.length, 2, 'Grid positions marked for each tile');
        });
    }

    async testMarkPathTilesAsUnavailable()
    {
        await this.test('markPathTilesAsUnavailable blocks grid cells with path tiles', async () => {
            let generator = this.buildGenerator();
            let pathLayerData = new Array(9).fill(0);
            pathLayerData[4] = 7;
            let mapGrid = this.buildWalkableGrid(3);
            generator.markPathTilesAsUnavailable(false, pathLayerData, mapGrid, 3, 3, false);
            this.assertEqual(mapGrid[1][1], false, 'Cell with path tile is blocked');
            this.assertEqual(mapGrid[0][0], true, 'Empty cell stays walkable');
        });
    }

}

module.exports.TestMainPathGenerator = TestMainPathGenerator;
