/**
 *
 * Reldens - Test Feature Combinations
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { ElementPlacementValidator } = require('../../lib/validator/element-placement-validator');
const { PathConnectivityValidator } = require('../../lib/validator/path-connectivity-validator');
const { WallsValidator } = require('../../lib/validator/walls-validator');
const { GroundVariationsValidator } = require('../../lib/validator/ground-variations-validator');
const { FreeSpaceValidator } = require('../../lib/validator/free-space-validator');
const { SpotsValidator } = require('../../lib/validator/spots-validator');

class TestFeatureCombinations extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.elementPlacementValidator = new ElementPlacementValidator();
        this.pathConnectivityValidator = new PathConnectivityValidator();
        this.wallsValidator = new WallsValidator();
        this.groundVariationsValidator = new GroundVariationsValidator();
        this.freeSpaceValidator = new FreeSpaceValidator();
        this.spotsValidator = new SpotsValidator();
    }

    async testElementsWithPathsIntegration()
    {
        let config = this.setupCompositeConfig();
        config.mainPathSize = 2;
        config.elementsQuantity = {
            'house1': 3,
            'tree': 5
        };
        config.generateElementsPath = true;
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Elements with paths integration', config, 20001, async (map, config) => {
            let elementValidation = this.elementPlacementValidator.validateElementQuantities(map, config);
            let pathValidation = this.pathConnectivityValidator.validateElementReachability(map, config);
            this.assert(elementValidation.isValid, 'Elements must be placed correctly with paths');
            this.assert(pathValidation.isValid, 'All elements must be reachable via paths');
        });
    }

    async testPathsWithWallsIntegration()
    {
        let config = this.setupCompositeConfig();
        config.mainPathSize = 1;
        config.applyPathsInnerWalls = true;
        config.applyPathsOuterWalls = true;
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Paths with walls integration', config, 20002, async (map, config) => {
            let pathValidation = this.pathConnectivityValidator.validatePathConnectivity(map, config);
            let innerWallsValidation = this.wallsValidator.validateInnerWallPlacement(map, config);
            let outerWallsValidation = this.wallsValidator.validateOuterWallPlacement(map, config);
            this.assert(pathValidation.isValid, 'Paths must remain connected with walls');
            this.assert(innerWallsValidation.isValid, 'Inner walls must be placed around paths');
            this.assert(outerWallsValidation.isValid, 'Outer walls must surround inner walls');
        });
    }

    async testGroundVariationsWithElementsIntegration()
    {
        let config = this.setupCompositeConfig();
        config.randomGroundTiles = [20, 21, 22];
        config.variableTilesPercentage = 25;
        config.elementsQuantity = {
            'tree': 6,
            'house1': 4
        };
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Ground variations with elements integration', config, 20003, async (map, config) => {
            let variationsValidation = this.groundVariationsValidator.validateVariationQuantity(map, config);
            let elementValidation = this.elementPlacementValidator.validateElementQuantities(map, config);
            this.assert(variationsValidation.isValid, 'Ground variations must work with elements');
            this.assert(elementValidation.isValid, 'Elements must be placed despite ground variations');
        });
    }

    async testFreeSpaceWithMultipleElementTypes()
    {
        let config = this.setupCompositeConfig();
        config.elementsQuantity = {
            'house1': 4,
            'tree': 8
        };
        config.minimumElementsFreeSpaceAround = 2;
        config.elementsFreeSpaceAround = {
            'house1': 4,
            'tree': 1
        };
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Free space with multiple element types', config, 20004, async (map, config) => {
            let elementValidation = this.elementPlacementValidator.validateElementQuantities(map, config);
            let freeSpaceValidation = this.freeSpaceValidator.validateFreeSpaceMinimums(map, config);
            this.assert(elementValidation.isValid, 'All element types must be placed');
            this.assert(freeSpaceValidation.isValid, 'Free space must be maintained between all elements');
        });
    }

    async testSpotsWithPathsAndElements()
    {
        let config = this.setupCompositeConfig();
        config.mainPathSize = 2;
        config.elementsQuantity = {
            'house1': 2,
            'tree': 4
        };
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Spots with paths and elements', config, 20005, async (map, config) => {
            let elementValidation = this.elementPlacementValidator.validateElementQuantities(map, config);
            let pathValidation = this.pathConnectivityValidator.validatePathConnectivity(map, config);
            this.assert(elementValidation.isValid, 'Elements must work with spots and paths');
            this.assert(pathValidation.isValid, 'Paths must remain connected with spots');
        });
    }

    async testAllFeaturesComplexIntegration()
    {
        let config = this.setupCompositeConfig();
        config.mainPathSize = 2;
        config.randomGroundTiles = [30, 31, 32];
        config.variableTilesPercentage = 20;
        config.applyPathsInnerWalls = true;
        config.applyPathsOuterWalls = true;
        config.elementsQuantity = {
            'house1': 3,
            'tree': 6
        };
        config.minimumElementsFreeSpaceAround = 2;
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('All features complex integration', config, 20006, async (map, config) => {
            let elementValidation = this.elementPlacementValidator.validateElementQuantities(map, config);
            let pathValidation = this.pathConnectivityValidator.validatePathConnectivity(map, config);
            let wallsValidation = this.wallsValidator.validateInnerWallPlacement(map, config);
            let variationsValidation = this.groundVariationsValidator.validateVariationQuantity(map, config);
            let freeSpaceValidation = this.freeSpaceValidator.validateFreeSpaceMinimums(map, config);
            this.assert(elementValidation.isValid, 'Elements must work in complex integration');
            this.assert(pathValidation.isValid, 'Paths must work in complex integration');
            this.assert(wallsValidation.isValid, 'Walls must work in complex integration');
            this.assert(variationsValidation.isValid, 'Ground variations must work in complex integration');
            this.assert(freeSpaceValidation.isValid, 'Free space must work in complex integration');
        });
    }

    async testPathsWithFreeSpaceAndWalls()
    {
        let config = this.setupCompositeConfig();
        config.mainPathSize = 3;
        config.applyPathsInnerWalls = true;
        config.elementsQuantity = {
            'house1': 2
        };
        config.minimumElementsFreeSpaceAround = 3;
        config.elementsAllowPathsInFreeSpace = true;
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Paths with free space and walls', config, 20007, async (map, config) => {
            let pathValidation = this.pathConnectivityValidator.validatePathConnectivity(map, config);
            let wallsValidation = this.wallsValidator.validateInnerWallPlacement(map, config);
            let freeSpaceValidation = this.freeSpaceValidator.validatePathsInFreeSpace(map, config);
            this.assert(pathValidation.isValid, 'Paths must work with walls and free space');
            this.assert(wallsValidation.isValid, 'Walls must work with paths and free space');
            this.assert(freeSpaceValidation.isValid, 'Free space must allow paths when configured');
        });
    }

    async testElementOverlapPrevention()
    {
        let config = this.setupCompositeConfig();
        config.elementsQuantity = {
            'house1': 4,
            'tree': 6
        };
        config.minimumElementsFreeSpaceAround = 1;
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Element overlap prevention', config, 20008, async (map, config) => {
            let elementValidation = this.elementPlacementValidator.validateElementOverlaps(map, config);
            let freeSpaceValidation = this.freeSpaceValidator.validateFreeSpaceMinimums(map, config);
            this.assert(elementValidation.isValid, 'Elements must not overlap');
            this.assert(freeSpaceValidation.isValid, 'Minimum distances must be maintained');
        });
    }

    async testComplexPathNetwork()
    {
        let config = this.setupCompositeConfig();
        config.mainPathSize = 8;
        config.elementsQuantity = {
            'house1': 5,
            'tree': 3
        };
        config.generateElementsPath = true;
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('Complex path network', config, 20009, async (map, config) => {
            let elementValidation = this.elementPlacementValidator.validateElementQuantities(map, config);
            let pathValidation = this.pathConnectivityValidator.validateElementReachability(map, config);
            let continuityValidation = this.pathConnectivityValidator.validatePathContinuity(map, config);
            this.assert(elementValidation.isValid, 'All elements must be placed in complex network');
            this.assert(pathValidation.isValid, 'Complex path network must connect all elements');
            this.assert(continuityValidation.isValid, 'Complex path network must be continuous');
        });
    }

    async testHighDensityConfiguration()
    {
        let config = this.setupCompositeConfig();
        config.mainPathSize = 1;
        config.randomGroundTiles = [90, 91, 92, 93, 94];
        config.variableTilesPercentage = 35;
        config.elementsQuantity = {
            'house1': 8,
            'tree': 15
        };
        config.minimumElementsFreeSpaceAround = 1;
        config.freeSpaceTilesQuantity = 3;
        await this.testWithDeterministicSeed('High density configuration', config, 20010, async (map, config) => {
            let elementValidation = this.elementPlacementValidator.validateElementQuantities(map, config);
            let variationsValidation = this.groundVariationsValidator.validateVariationQuantity(map, config);
            let freeSpaceValidation = this.freeSpaceValidator.validateFreeSpaceMinimums(map, config);
            this.assert(elementValidation.isValid, 'High density elements must be placed correctly');
            this.assert(variationsValidation.isValid, 'High density variations must work');
            this.assert(freeSpaceValidation.isValid, 'High density free space must be maintained');
        });
    }

}

module.exports.TestFeatureCombinations = TestFeatureCombinations;
