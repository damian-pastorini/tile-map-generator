/**
 *
 * Reldens - Test Outer Walls
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { OuterWalls } = require('../lib/patterns/outer-walls');

class TestOuterWalls extends BaseMapGeneratorTest
{

    async testSequences()
    {
        let spotTiles = {
            p: 1, tC: 99, sTL: 2, sTC: 3, sTR: 4, sMC: 6, sML: 5, sMR: 7,
            sBL: 8, sBC: 9, sBR: 10, cTL: 11, cTR: 12, cBL: 13, cBR: 14
        };
        let outerTiles = {sMC: 60, sMR: 70, sML: 50, sTC: 30, cTL: 110, cTR: 120};
        await this.test('every step key holds a populated pattern list', async () => {
            let sequences = OuterWalls.sequences(spotTiles, outerTiles);
            let stepKeys = Object.keys(sequences);
            this.assertEqual(stepKeys.length, 5, 'there should be five outer wall steps');
            for(let stepKey of stepKeys){
                this.assertEqual(Array.isArray(sequences[stepKey]), true, 'step '+stepKey+' should be an array');
                this.assert(0 < sequences[stepKey].length, 'step '+stepKey+' should not be empty');
            }
        });
        await this.test('outerTiles values are interpolated in step3', async () => {
            let sequences = OuterWalls.sequences(spotTiles, outerTiles);
            let outerPattern = sequences.step3[6];
            this.assertEqual(outerPattern[0][0], outerTiles.sMC, 'source should use outer sMC');
            this.assertEqual(outerPattern[0][1], outerTiles.sMR, 'source should use outer sMR');
        });
    }

}

module.exports.TestOuterWalls = TestOuterWalls;
