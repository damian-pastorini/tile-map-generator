/**
 *
 * Reldens - Test Outer Walls Merge
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { OuterWallsMerge } = require('../lib/patterns/outer-walls-merge');

class TestOuterWallsMerge extends BaseMapGeneratorTest
{

    async testSequences()
    {
        let spotTiles = {
            p: 1, tC: 99, sTL: 2, sTC: 3, sTR: 4, sMC: 6, sML: 5, sMR: 7,
            sBL: 8, sBC: 9, sBR: 10, cTL: 11, cTR: 12, cBL: 13, cBR: 14
        };
        let outerTiles = {sMC: 60, sMR: 70, sML: 50, sTC: 30, sBC: 90, cBL: 130, cBR: 140};
        await this.test('sequences returns eight merge steps', async () => {
            let sequences = OuterWallsMerge.sequences(spotTiles, outerTiles, 0);
            let stepKeys = Object.keys(sequences);
            this.assertEqual(stepKeys.length, 8, 'there should be eight merge steps');
            this.assert(sequences.step8, 'step8 must be present');
        });
        await this.test('outerTc parameter is used in step3 replacement', async () => {
            let sequences = OuterWallsMerge.sequences(spotTiles, outerTiles, 555);
            let pattern = sequences.step3[0];
            this.assertEqual(pattern[1][1], 555, 'replacement should use the provided outerTc');
        });
        await this.test('default outerTiles and outerTc do not throw', async () => {
            let sequences = OuterWallsMerge.sequences(spotTiles);
            this.assert(sequences.step1, 'step1 should still be produced with defaults');
            this.assertEqual(sequences.step3[0][1][1], 0, 'default outerTc should be zero');
        });
    }

}

module.exports.TestOuterWallsMerge = TestOuterWallsMerge;
