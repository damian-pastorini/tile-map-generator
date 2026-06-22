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

}

module.exports.TestBordersPatterns = TestBordersPatterns;
