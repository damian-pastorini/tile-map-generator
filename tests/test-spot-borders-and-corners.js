/**
 *
 * Reldens - Test Spot Borders And Corners
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotBordersAndCorners } = require('../lib/generator/spot-borders-and-corners');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { BordersPatterns } = require('../lib/patterns/borders-patterns');

let spotTilesShortcuts = {
    p: 1, sTL: 11, sTC: 12, sTR: 13, sML: 14, sMR: 15, sBL: 16, sBC: 17, sBR: 18,
    cTL: 21, cTR: 22, cBL: 23, cBR: 24
};

class TestSpotBordersAndCorners extends BaseMapGeneratorTest
{

    async testApplySplitBordersDisabledReturnsMainLayer()
    {
        await this.test('applySplitBordersAndCorners returns main layer when corners disabled', async () => {
            let instance = new SpotBordersAndCorners(new GeometryCalculator(), new BordersPatterns());
            let mainLayer = [1, 2, 3, 4];
            let result = instance.applySplitBordersAndCorners(false, 2, 2, false, mainLayer, {});
            this.assertEqual(result, mainLayer, 'Should return the same main layer reference');
        });
    }

    async testApplyBorderEndTilesNoSingleConnections()
    {
        await this.test('applyBorderEndTiles leaves layer unchanged without single connections', async () => {
            let instance = new SpotBordersAndCorners(new GeometryCalculator(), new BordersPatterns());
            let bordersLayer = new Array(9).fill(0);
            let result = instance.applyBorderEndTiles(bordersLayer, [], {}, spotTilesShortcuts, 3, 3);
            this.assertEqual(result.length, 9, 'Layer length preserved');
            this.assertEqual(result.filter(tile => 0 !== tile).length, 0, 'No tiles introduced');
        });
    }

    async testApplyBorderEndTilesAssignsCorners()
    {
        await this.test('applyBorderEndTiles replaces a single connection border end with corner tiles', async () => {
            let instance = new SpotBordersAndCorners(new GeometryCalculator(), new BordersPatterns());
            let bordersLayer = [0, 17, 0, 0, 0, 0, 0, 0, 0];
            let removedBorders = {4: spotTilesShortcuts.sBC};
            let result = instance.applyBorderEndTiles(bordersLayer, [4], removedBorders, spotTilesShortcuts, 3, 3);
            this.assertEqual(result[4], spotTilesShortcuts.cBR, 'Border end becomes bottom right corner');
            this.assertEqual(result[7], spotTilesShortcuts.cTR, 'Cell below becomes top right corner');
        });
    }

    async testApplySplitBordersAndCornersGeneratesBorders()
    {
        await this.test('applySplitBordersAndCorners surrounds a path tile with border tiles', async () => {
            let instance = new SpotBordersAndCorners(new GeometryCalculator(), new BordersPatterns());
            let mainLayer = [0, 0, 0, 0, 1, 0, 0, 0, 0];
            let result = instance.applySplitBordersAndCorners(true, 3, 3, false, mainLayer, spotTilesShortcuts);
            this.assertEqual(result.length, 9, 'Layer length preserved');
            this.assert(result.filter(tile => 0 !== tile).length > 1, 'Borders added around the path tile');
        });
    }

    async testApplySplitBordersAndCornersRemovesPathTilesInSplitMode()
    {
        await this.test('applySplitBordersAndCorners removes path tiles when splitting into layers', async () => {
            let instance = new SpotBordersAndCorners(new GeometryCalculator(), new BordersPatterns());
            let mainLayer = [0, 0, 0, 0, 1, 0, 0, 0, 0];
            let result = instance.applySplitBordersAndCorners(true, 3, 3, true, mainLayer, spotTilesShortcuts);
            this.assertEqual(result.filter(tile => spotTilesShortcuts.p === tile).length, 0, 'Path tiles removed from borders layer');
        });
    }

}

module.exports.TestSpotBordersAndCorners = TestSpotBordersAndCorners;
