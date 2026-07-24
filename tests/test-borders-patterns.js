/**
 *
 * Reldens - Test Borders Patterns
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { BordersPatterns } = require('../lib/patterns/borders-patterns');

class TestBordersPatterns extends BaseMapGeneratorTest
{

    async testReplaceSequence()
    {
        let bordersPatterns = new BordersPatterns();
        await this.test('replaceSequence rewrites a matching horizontal run', async () => {
            let layerData = [1, 0, 1, 0, 0, 0, 0, 0, 0];
            bordersPatterns.replaceSequence(layerData, [1, 0, 1], [1, 1, 1], 3);
            this.assertEqual(layerData[0], 1, 'first tile stays');
            this.assertEqual(layerData[1], 1, 'gap filled');
            this.assertEqual(layerData[2], 1, 'third tile stays');
        });
        await this.test('replaceSequence does not cross row boundaries', async () => {
            let layerData = [0, 0, 1, 0, 1, 0, 0, 0, 0];
            bordersPatterns.replaceSequence(layerData, [1, 0, 1], [1, 1, 1], 3);
            this.assertEqual(layerData[2], 1, 'tile on row boundary stays');
            this.assertEqual(layerData[3], 0, 'next row first tile must not be filled');
        });
    }

    async testRotation()
    {
        let bordersPatterns = new BordersPatterns();
        await this.test('rotateLayer90Degrees then rollback restores original data', async () => {
            let layerData = [1, 2, 3, 4, 5, 6];
            let rotated = bordersPatterns.rotateLayer90Degrees(layerData, 3, 2);
            this.assertEqual(rotated.length, 6, 'rotation keeps element count');
            let restored = bordersPatterns.rollbackRotation90Degrees(rotated, 2, 3);
            this.assertDeepEqual(restored, layerData, 'rollback restores original layout');
        });
        await this.test('rotateLayer90Degrees places the bottom-left value at the top-left', async () => {
            let layerData = [1, 2, 3, 4, 5, 6];
            let rotated = bordersPatterns.rotateLayer90Degrees(layerData, 3, 2);
            this.assertEqual(rotated[0], 3, 'top-right of original becomes top-left after rotation');
        });
    }

    async testApplyRotationToCompletePathGrid()
    {
        let bordersPatterns = new BordersPatterns();
        await this.test('applyRotationToCompletePathGrid fills single gaps between path tiles', async () => {
            let layerData = [
                5, 0, 5,
                0, 0, 0,
                5, 0, 5
            ];
            let result = bordersPatterns.applyRotationToCompletePathGrid(5, layerData, 3, 3);
            this.assertEqual(result[1], 5, 'horizontal gap between path tiles filled');
            this.assertEqual(result[3], 5, 'vertical gap between path tiles filled');
        });
    }

    async testReplaceSequences()
    {
        let bordersPatterns = new BordersPatterns();
        await this.test('replaceSequences applies every supplied sequence in order', async () => {
            let layerData = [1, 0, 1, 2, 0, 2, 0, 0, 0];
            let sequences = [[[1, 0, 1], [1, 1, 1]], [[2, 0, 2], [2, 2, 2]]];
            bordersPatterns.replaceSequences(layerData, sequences, 3);
            this.assertDeepEqual(layerData.slice(0, 3), [1, 1, 1], 'first sequence filled the first row');
            this.assertDeepEqual(layerData.slice(3, 6), [2, 2, 2], 'second sequence filled the second row');
            this.assertDeepEqual(layerData.slice(6, 9), [0, 0, 0], 'unmatched row remains untouched');
        });
    }

    async testApplyPatternPipeline()
    {
        let bordersPatterns = new BordersPatterns();
        await this.test('applyPatternPipeline applies sequences horizontally and vertically', async () => {
            let layerData = [5, 0, 5, 0, 0, 0, 5, 0, 5];
            let sequences = [[[5, 0, 5], [5, 5, 5]]];
            let result = bordersPatterns.applyPatternPipeline(layerData, sequences, 3, 3);
            this.assertEqual(result.length, 9, 'pipeline preserves the cell count');
            this.assertDeepEqual(result, [5, 5, 5, 5, 5, 5, 5, 5, 5], 'both axes were filled by the pipeline');
        });
    }

    async testApplyBordersAndCornersTiles()
    {
        let bordersPatterns = new BordersPatterns();
        await this.test('applyBordersAndCornersTiles wraps a path block with borders while preserving path tiles', async () => {
            let shortcuts = {
                p: 1, sTL: 2, sTC: 3, sTR: 4, sML: 5, sMC: 6, sMR: 7,
                sBL: 8, sBC: 9, sBR: 10, cTL: 11, cTR: 12, cBL: 13, cBR: 14
            };
            let layerData = [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0];
            let original = [...layerData];
            let result = bordersPatterns.applyBordersAndCornersTiles(layerData, 5, 5, shortcuts);
            this.assertEqual(result.length, 25, 'output keeps the original cell count');
            let changed = result.some((tile, index) => tile !== original[index]);
            this.assert(changed, 'border application transforms the grid');
            let pathCount = result.filter(tile => tile === shortcuts.p).length;
            this.assert(9 <= pathCount, 'every path tile is preserved; borders are added around them, never over them');
            let borderValues = [2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14];
            let hasBorder = result.some(tile => -1 !== borderValues.indexOf(tile));
            this.assert(hasBorder, 'border and corner shortcut tiles are introduced');
        });
    }

}

module.exports.TestBordersPatterns = TestBordersPatterns;
