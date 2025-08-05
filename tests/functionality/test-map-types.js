/**
 *
 * Reldens - Test Map Types
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { MapTypeValidator } = require('../../lib/validator/map-type-validator');

class TestMapTypes extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.mapTypeValidator = new MapTypeValidator();
    }

    async testNormalMapPatterns()
    {
        let config = this.setupComplexConfig();
        config.blockMapBorder = false;
        config.mainPathSize = 4;
        await this.testWithDeterministicSeed('Normal map patterns', config, 55667, async (map, config) => {
            let customThresholds = {
                linearHigh: 0.8,
                linearLow: 0.1,
                branchingHigh: 0.3,
                connectivityHigh: 0.6,
                semiLinear: 0.4
            };
            let validation = this.mapTypeValidator.validateNormalMapPatterns(map, config, 59.7994, 'branching', customThresholds);
            this.logFunctionalityResult('Normal Map Patterns', validation);
            this.assert(validation.isValid, 'Normal map must have correct patterns');
            this.assert(validation.openAreas, 'Normal map must have sufficient open areas');
        });
    }

    async testDungeonMapPatterns()
    {
        let config = this.setupComplexConfig();
        config.blockMapBorder = true;
        config.entryPosition = 'top-middle';
        config.entryPositionSize = 3;
        await this.testWithDeterministicSeed('Dungeon map patterns', config, 77889, async (map, config) => {
            let validation = this.mapTypeValidator.validateDungeonMapPatterns(map, config, 30, 60);
            this.logFunctionalityResult('Dungeon Map Patterns', validation);
            this.assert(validation.isValid, 'Dungeon map must have correct patterns');
            this.assert(validation.enclosedSpaces, 'Dungeon must have proper enclosure');
            this.assert(validation.doorConnections, 'Dungeon must have entry connections');
        });
    }

    async testMapArchitectureAnalysis()
    {
        let config = this.setupComplexConfig();
        await this.testWithDeterministicSeed('Map architecture analysis', config, 99001, async (map, config) => {
            let mapType = this.mapTypeValidator.determineMapType(config);
            let customOpenSpaceRange = {
                'normal': {min: 60, max: 85},
                'dungeon': {min: 30, max: 60},
                'enclosed': {min: 50, max: 80},
                'basic': {min: 70, max: 95}
            };
            let customPathRange = {
                'normal': {min: 5, max: 20},
                'dungeon': {min: 15, max: 35},
                'enclosed': {min: 8, max: 25},
                'basic': {min: 2, max: 15}
            };
            let validation = this.mapTypeValidator.analyzeMapArchitecture(map, config, mapType, customOpenSpaceRange, customPathRange);
            this.logFunctionalityResult('Map Architecture Analysis', validation);
            this.assert(validation.isValid, 'Map architecture must match type requirements');
            this.assert(validation.validations.openSpace, 'Open space ratio must be valid');
            this.assert(validation.validations.pathRatio, 'Path ratio must be valid');
        });
    }

}

module.exports.TestMapTypes = TestMapTypes;
