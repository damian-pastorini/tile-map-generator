/**
 *
 * Reldens - Test Corners
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { Corners } = require('../lib/patterns/corners');

class TestCorners extends BaseMapGeneratorTest
{

    async testSequences()
    {
        let spotTiles = {
            sTL: 2, sTR: 4, sBL: 8, sBR: 10, cTL: 11, cTR: 12, cBL: 13, cBR: 14
        };
        let outerTiles = {cBL: 130, cBR: 140};
        await this.test('sequences returns step1 with eight corner clears', async () => {
            let sequences = Corners.sequences(spotTiles, outerTiles);
            this.assertEqual(sequences.step1.length, 8, 'step1 should hold eight patterns');
            this.assertEqual(sequences.step2.length, 2, 'step2 should hold two patterns');
        });
        await this.test('each step1 pattern clears the center tile to zeros', async () => {
            let sequences = Corners.sequences(spotTiles, outerTiles);
            for(let pattern of sequences.step1){
                this.assertEqual(pattern[1][0], 0, 'target left should be zero');
                this.assertEqual(pattern[1][1], 0, 'target center should be zero');
                this.assertEqual(pattern[1][2], 0, 'target right should be zero');
            }
        });
        await this.test('step2 references outer corner tiles', async () => {
            let sequences = Corners.sequences(spotTiles, outerTiles);
            this.assertEqual(sequences.step2[0][0][1], outerTiles.cBL, 'first step2 source should be outer cBL');
            this.assertEqual(sequences.step2[1][0][1], outerTiles.cBR, 'second step2 source should be outer cBR');
        });
        await this.test('default outerTiles produces unset corner sources', async () => {
            let sequences = Corners.sequences(spotTiles);
            this.assertEqual(typeof sequences.step2[0][0][1], 'undefined', 'missing outer tile should be unset');
        });
    }

}

module.exports.TestCorners = TestCorners;
