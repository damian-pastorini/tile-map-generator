/**
 *
 * Reldens - Test Constants
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { GeneratedFoldersConstants, MainPathEdgesConstants } = require('../lib/constants');

class TestConstants extends BaseMapGeneratorTest
{

    async testGeneratedFoldersConstants()
    {
        let constants = GeneratedFoldersConstants;
        await this.test('GeneratedFoldersConstants exposes the optimized sub folder name', async () => {
            this.assertEqual(constants.OPTIMIZED_SUB_FOLDER, 'optimized', 'optimized sub folder name is set');
            this.assertEqual(typeof constants, 'object', 'constants are exported as an object');
        });
    }

    async testMainPathEdgesConstants()
    {
        await this.test('MainPathEdgesConstants follows the random main path edge numbering', async () => {
            this.assertDeepEqual(
                MainPathEdgesConstants,
                {TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3},
                'Edges are numbered clockwise from the top like generateFullMainPathWithIndexes'
            );
        });
    }

}

module.exports.TestConstants = TestConstants;
