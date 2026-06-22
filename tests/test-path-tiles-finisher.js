/**
 *
 * Reldens - Test Path Tiles Finisher
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PathTilesFinisher } = require('../lib/generator/path-tiles-finisher');
const { BordersPatterns } = require('../lib/patterns/borders-patterns');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { TilePositionCalculator } = require('../lib/generator/tile-position-calculator');

class TestPathTilesFinisher extends BaseMapGeneratorTest
{

    buildFinisher(mapWidth)
    {
        return new PathTilesFinisher(
            new BordersPatterns(),
            new LayerDataFactory(),
            {isOccupiedByAnotherCollision: () => false},
            null,
            new GeometryCalculator(),
            new TilePositionCalculator({mapWidth, mapHeight: 0})
        );
    }

    async testFillPathSingleTiles()
    {
        await this.test('fillPathSingleTiles bridges single empty gap between path tiles', async () => {
            let finisher = this.buildFinisher(3);
            let pathLayerData = [7, 0, 7, 0, 0, 0, 0, 0, 0];
            let result = finisher.fillPathSingleTiles(pathLayerData, 7, 3, 3);
            this.assertEqual(result[1], 7, 'Gap between two path tiles filled');
        });
    }

    async testFetchPathBorderEndTiles()
    {
        await this.test('fetchPathBorderEndTiles returns tiles with a single connection', async () => {
            let finisher = this.buildFinisher(3);
            let splitBorderLayer = [0, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 0];
            let endTiles = finisher.fetchPathBorderEndTiles(splitBorderLayer, 3);
            this.assert(-1 !== endTiles.indexOf(4), 'Top tile with one connection is an end tile');
            this.assert(-1 !== endTiles.indexOf(7), 'Bottom tile with one connection is an end tile');
        });
    }

    async testApplyCleanPathBorderTilesDisabled()
    {
        await this.test('applyCleanPathBorderTiles returns layer unchanged when disabled', async () => {
            let finisher = this.buildFinisher(3);
            let splitBorderLayer = [1, 2, 3];
            let result = finisher.applyCleanPathBorderTiles(splitBorderLayer, 3, 1, [], false, 7);
            this.assertEqual(result, splitBorderLayer, 'Returns same layer when cleaning disabled');
        });
    }

    async testCleanUpMapBorders()
    {
        await this.test('cleanUpMapBorders removes invalid edge tiles', async () => {
            let finisher = this.buildFinisher(3);
            let tilesShortcuts = {
                sTL: 1, sTC: 2, sTR: 3, sML: 4, sMR: 5, sBL: 6, sBC: 7, sBR: 8
            };
            let bordersLayer = [
                7, 7, 7,
                0, 0, 0,
                2, 2, 2
            ];
            let result = finisher.cleanUpMapBorders(bordersLayer, tilesShortcuts, 3, 3);
            this.assertEqual(result[0], 0, 'Bottom corner value on top row removed');
            this.assertEqual(result[1], 0, 'Bottom center value on top row removed');
            this.assertEqual(result[6], 0, 'Top corner value on bottom row removed');
            this.assertEqual(result[7], 0, 'Top center value on bottom row removed');
        });
    }

}

module.exports.TestPathTilesFinisher = TestPathTilesFinisher;
