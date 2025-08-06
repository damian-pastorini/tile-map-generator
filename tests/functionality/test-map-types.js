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
            let validation = this.mapTypeValidator.validateNormalMapPatterns(
                map,
                config,
                'branching',
                customThresholds
            );
            this.logFunctionalityResult('Normal Map Patterns', validation);
            this.assert(validation.isValid, 'Normal map must have correct patterns');
            this.assert(validation.connectingPaths, 'Normal map must have connecting paths');
            this.assert(validation.explorative, 'Normal map must have expected navigation pattern');
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
            this.logFunctionalityResult('Map Type Determination', {isValid: true, mapType: mapType});
            this.assert('normal' === mapType || 'dungeon' === mapType || 'enclosed' === mapType || 'basic' === mapType, 'Map type must be valid');
            let pathLayer = this.mapTypeValidator.findLayerByName(map, 'path');
            let generateElementsPath = config.generateElementsPath !== false;
            if(generateElementsPath){
                this.assert(pathLayer, 'Map must have path layer when generateElementsPath is enabled');
            }
            this.validateElementPlacement(map, config);
            this.validatePathConnectivity(map, config);
            this.validateLayerIntegrity(map, config);
        });
    }

}

module.exports.TestMapTypes = TestMapTypes;
