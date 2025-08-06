/**
 *
 * Reldens - Base Functionality Test
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MapValidator } = require('../lib/validator/map-validator');
const { GraphAlgorithms } = require('../lib/utilities/graph-algorithms');
const { DistanceCalculator } = require('../lib/utilities/distance-calculator');
const { OptionsValidator } = require('../lib/validator/options-validator');
const { RandomMapGenerator } = require('../lib/random-map-generator');
const { Logger } = require('@reldens/utils');

class BaseFunctionalityTest extends BaseMapGeneratorTest
{

    constructor()
    {
        super();
        this.mapValidator = new MapValidator();
        this.graphAlgorithms = new GraphAlgorithms();
        this.distanceCalculator = new DistanceCalculator();
        this.optionsValidator = new OptionsValidator();
        this.functionalityResults = [];
    }

    async testWithDeterministicSeed(testName, config, seed, testFunction)
    {
        if(!config){
            config = this.setupBasicConfig();
        }
        this.currentSeed = seed;
        Math.random = this.seedRandom(seed);
        try {
            await this.test(testName, async () => {
                let result = await this.testCurrentGenerationWithGenerator(config);
                if(!result.map){
                    let validationError = this.getLastValidationError(config);
                    let errorMessage = validationError || 'Map generation failed - unknown error';
                    Logger.log(100, '', 'Map generation failed for test: '+testName+' - '+errorMessage);
                    throw new Error(errorMessage);
                }
                await testFunction(result.map, config, result.generator);
            });
        } finally {
            this.restoreMathRandom();
            this.currentSeed = null;
        }
    }

    async testCurrentGenerationWithGenerator(config)
    {
        let generator = null;
        let map = null;
        if(config.tileMapJSON){
            generator = new RandomMapGenerator();
            await generator.fromElementsProvider(config);
        }
        if(!config.tileMapJSON){
            generator = new RandomMapGenerator(config);
        }
        if(generator){
            map = await generator.generate();
            if(generator.mapFileName){
                this.currentMapName = generator.mapFileName;
            }
        }
        return {map, generator};
    }

    getLastValidationError(config)
    {
        this.optionsValidator.validate(config);
        return this.optionsValidator.lastError;
    }

    logFunctionalityResult(testName, result)
    {
        this.functionalityResults.push({
            testName,
            result,
            timestamp: new Date().toISOString()
        });
        let status = result.isValid ? 'PASS' : 'FAIL';
        let logMessage = 'Functionality Test '+status+': '+testName;
        if(this.currentTestMethod){
            logMessage += ' ['+this.currentTestMethod+']';
        }
        Logger.log(100, '', logMessage);
    }

}

module.exports.BaseFunctionalityTest = BaseFunctionalityTest;
