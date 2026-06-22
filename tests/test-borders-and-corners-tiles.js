/**
 *
 * Reldens - Test Borders And Corners Tiles
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { BordersAndCornersTiles } = require('../lib/patterns/borders-and-corners-tiles');

class TestBordersAndCornersTiles extends BaseMapGeneratorTest
{

    async testSequences()
    {
        let shortcuts = {
            p: 1, sTL: 2, sTC: 3, sTR: 4, sML: 5, sMC: 6, sMR: 7,
            sBL: 8, sBC: 9, sBR: 10, cTL: 11, cTR: 12, cBL: 13, cBR: 14
        };
        await this.test('sequences returns the six pattern steps', async () => {
            let sequences = BordersAndCornersTiles.sequences(shortcuts);
            this.assert(sequences.step1, 'step1 should exist');
            this.assert(sequences.step2, 'step2 should exist');
            this.assert(sequences.step3, 'step3 should exist');
            this.assert(sequences.step4, 'step4 should exist');
            this.assert(sequences.step5, 'step5 should exist');
            this.assert(sequences.step6, 'step6 should exist');
        });
        await this.test('each step is a non-empty array', async () => {
            let sequences = BordersAndCornersTiles.sequences(shortcuts);
            for(let stepKey of Object.keys(sequences)){
                let step = sequences[stepKey];
                this.assert(Array.isArray(step), 'step should be an array');
                this.assert(0 < step.length, 'step should not be empty');
            }
        });
        await this.test('each pair in step1 has a source and target array', async () => {
            let sequences = BordersAndCornersTiles.sequences(shortcuts);
            for(let pair of sequences.step1){
                this.assertEqual(pair.length, 2, 'each pair should have two members');
                this.assert(Array.isArray(pair[0]), 'pair source should be an array');
                this.assert(Array.isArray(pair[1]), 'pair target should be an array');
            }
        });
        await this.test('sequences substitute shortcut values', async () => {
            let sequences = BordersAndCornersTiles.sequences(shortcuts);
            let firstSource = sequences.step1[0][0];
            this.assertEqual(firstSource[0], shortcuts.p, 'first tile should map to p shortcut');
            this.assertEqual(firstSource[1], 0, 'gap tile should remain zero');
            this.assertEqual(firstSource[2], shortcuts.p, 'third tile should map to p shortcut');
            this.assertEqual(typeof BordersAndCornersTiles.sequences, 'function', 'sequences should be a function');
        });
    }

}

module.exports.TestBordersAndCornersTiles = TestBordersAndCornersTiles;
