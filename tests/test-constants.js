/**
 *
 * Reldens - Test Constants
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { GeneratedFoldersConstants } = require('../lib/constants');

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

}

module.exports.TestConstants = TestConstants;
