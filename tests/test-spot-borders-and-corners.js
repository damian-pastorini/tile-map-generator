/**
 *
 * Reldens - Test Spot Borders And Corners
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { SpotBordersAndCorners } = require('../lib/generator/spot-borders-and-corners');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { BordersPatterns } = require('../lib/patterns/borders-patterns');

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
            let spotTiles = {
                p: 1, sTL: 11, sTC: 12, sTR: 13, sML: 14, sMR: 15, sBL: 16, sBC: 17, sBR: 18,
                cTL: 21, cTR: 22, cBL: 23, cBR: 24
            };
            let bordersLayer = new Array(9).fill(0);
            let result = instance.applyBorderEndTiles(bordersLayer, [], {}, spotTiles, 3, 3);
            this.assertEqual(result.length, 9, 'Layer length preserved');
            this.assertEqual(result.filter(tile => 0 !== tile).length, 0, 'No tiles introduced');
        });
    }

}

module.exports.TestSpotBordersAndCorners = TestSpotBordersAndCorners;
