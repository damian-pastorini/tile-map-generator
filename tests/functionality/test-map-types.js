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
            let validation = this.mapTypeValidator.validateNormalMapPatterns(map, config);
            this.logFunctionalityResult('Normal Map Patterns', validation);
            this.assert(validation.isValid, 'Normal map must have correct patterns');
            this.assert(validation.openAreas, 'Normal map must have sufficient open areas');
            this.assert(validation.scatteredElements, 'Elements must be well distributed');
        });
    }

    async testDungeonMapPatterns()
    {
        let config = this.setupComplexConfig();
        config.blockMapBorder = true;
        config.entryPosition = 'top-middle';
        config.entryPositionSize = 3;
        await this.testWithDeterministicSeed('Dungeon map patterns', config, 77889, async (map, config) => {
            let validation = this.mapTypeValidator.validateDungeonMapPatterns(map, config);
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
            let validation = this.mapTypeValidator.analyzeMapArchitecture(map, config, mapType);
            this.logFunctionalityResult('Map Architecture Analysis', validation);
            this.assert(validation.isValid, 'Map architecture must match type requirements');
            this.assert(validation.validations.openSpace, 'Open space ratio must be valid');
            this.assert(validation.validations.pathRatio, 'Path ratio must be valid');
        });
    }

}

module.exports.TestMapTypes = TestMapTypes;
