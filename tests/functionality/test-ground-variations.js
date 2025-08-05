/**
 *
 * Reldens - Test Ground Variations
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { GroundVariationsValidator } = require('../../lib/validator/ground-variations-validator');

class TestGroundVariations extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.groundVariationsValidator = new GroundVariationsValidator();
    }

    async testVariationPercentageAccuracy()
    {
        let config = this.setupComplexConfig();
        config.variableTilesPercentage = 15;
        config.randomGroundTiles = [26, 27, 28, 29, 30];
        await this.testWithDeterministicSeed('Variation percentage accuracy', config, 55555, async (map, config) => {
            let validation = this.groundVariationsValidator.validateVariationPercentage(map, config, 2);
            this.logFunctionalityResult('Variation Percentage Accuracy', validation);
            this.assert(validation.isValid, 'Variation percentage must be within tolerance');
            this.assert(validation.percentageDifference <= validation.tolerance, 'Percentage difference must be <= 2%');
        });
    }

    async testVariationTileTypesValid()
    {
        let config = this.setupComplexConfig();
        config.randomGroundTiles = [26, 27, 28, 29];
        await this.testWithDeterministicSeed('Variation tile types valid', config, 77777, async (map, config) => {
            let validation = this.groundVariationsValidator.validateVariationTileTypes(map, config);
            this.logFunctionalityResult('Variation Tile Types Valid', validation);
            this.assert(validation.isValid, 'All variation tiles must use configured tile types');
            this.assert(0 === validation.incorrectTileTypes, 'No incorrect tile types allowed');
        });
    }

    async testVariationPlacementConstraints()
    {
        let config = this.setupComplexConfig();
        config.variableTilesPercentage = 10;
        await this.testWithDeterministicSeed('Variation placement constraints', config, 88888, async (map, config) => {
            let validation = this.groundVariationsValidator.validateVariationPlacement(map, config);
            this.logFunctionalityResult('Variation Placement Constraints', validation);
            this.assert(validation.isValid, 'Variations must not overwrite paths or elements');
            this.assert(0 === validation.incorrectPlacements, 'No incorrect placements allowed');
        });
    }

}

module.exports.TestGroundVariations = TestGroundVariations;
