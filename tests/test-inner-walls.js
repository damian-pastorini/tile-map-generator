/**
 *
 * Reldens - Test Inner Walls
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { InnerWalls } = require('../lib/patterns/inner-walls');

class TestInnerWalls extends BaseMapGeneratorTest
{

    async testSequences()
    {
        let shortcuts = {sML: 5, sMC: 6, sMR: 7, cTR: 12, cTL: 11, sTC: 3};
        await this.test('sequences returns a step1 array', async () => {
            let sequences = InnerWalls.sequences(shortcuts);
            this.assert(sequences.step1, 'step1 should exist');
            this.assert(Array.isArray(sequences.step1), 'step1 should be an array');
            this.assertEqual(sequences.step1.length, 4, 'step1 should hold four patterns');
        });
        await this.test('each step1 pair holds source and target arrays', async () => {
            let sequences = InnerWalls.sequences(shortcuts);
            for(let pair of sequences.step1){
                this.assertEqual(pair.length, 2, 'pair should have two members');
                this.assert(Array.isArray(pair[0]), 'source should be an array');
                this.assert(Array.isArray(pair[1]), 'target should be an array');
            }
        });
        await this.test('first pattern maps sMC to sML on replacement', async () => {
            let sequences = InnerWalls.sequences(shortcuts);
            let firstPattern = sequences.step1[0];
            this.assertEqual(firstPattern[0][0], shortcuts.sMC, 'source first tile should be sMC');
            this.assertEqual(firstPattern[1][0], shortcuts.sML, 'target first tile should be sML');
        });
    }

}

module.exports.TestInnerWalls = TestInnerWalls;
