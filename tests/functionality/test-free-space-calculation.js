/**
 *
 * Reldens - Test Free Space Calculation
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { FreeSpaceValidator } = require('../../lib/validator/free-space-validator');

class TestFreeSpaceCalculation extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.freeSpaceValidator = new FreeSpaceValidator();
    }

    async testMinimumDistanceEnforcement()
    {
        let config = this.setupComplexConfig();
        config.elementsFreeSpaceAround = {house1: 3, house2: 2, tree: 1};
        config.minimumElementsFreeSpaceAround = 2;
        await this.testWithDeterministicSeed('Minimum distance enforcement', config, 99999, async (map, config) => {
            let validation = this.freeSpaceValidator.validateFreeSpaceMinimums(map, config);
            this.logFunctionalityResult('Minimum Distance Enforcement', validation);
            this.assert(validation.isValid, 'All elements must meet minimum distance requirements');
            this.assert(0 === validation.violatedDistances, 'No distance violations allowed');
            this.assert(100 === validation.compliancePercentage, 'Distance compliance must be 100%');
        });
    }

    async testFreeSpaceBoundaryEnforcement()
    {
        let config = this.setupComplexConfig();
        config.elementsFreeSpaceAround = {house1: 2, tree: 1};
        await this.testWithDeterministicSeed('Free space boundary enforcement', config, 11223, async (map, config) => {
            let validation = this.freeSpaceValidator.validateFreeSpaceBoundaries(map, config);
            this.logFunctionalityResult('Free Space Boundary Enforcement', validation);
            this.assert(validation.isValid, 'Free space boundaries must contain only allowed tiles');
            this.assert(0 === validation.invalidBoundaries, 'No boundary violations allowed');
        });
    }

    async testPathsInFreeSpaceConfiguration()
    {
        let config = this.setupComplexConfig();
        config.elementsAllowPathsInFreeSpace = {house1: true, tree: false};
        config.defaultElementsAllowPathsInFreeSpace = true;
        await this.testWithDeterministicSeed('Paths in free space configuration', config, 33445, async (map, config) => {
            let validation = this.freeSpaceValidator.validatePathsInFreeSpace(map, config);
            this.logFunctionalityResult('Paths In Free Space Configuration', validation);
            this.assert(validation.isValid, 'Path placement in free space must follow configuration');
            this.assert(0 === validation.incorrectPathHandling, 'No incorrect path handling allowed');
        });
    }

}

module.exports.TestFreeSpaceCalculation = TestFreeSpaceCalculation;
