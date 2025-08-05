/**
 *
 * Reldens - Test Complete Workflows
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { ElementPlacementValidator } = require('../../lib/validator/element-placement-validator');
const { PathConnectivityValidator } = require('../../lib/validator/path-connectivity-validator');
const { WallsValidator } = require('../../lib/validator/walls-validator');
const { GroundVariationsValidator } = require('../../lib/validator/ground-variations-validator');
const { FreeSpaceValidator } = require('../../lib/validator/free-space-validator');
const { MapTypeValidator } = require('../../lib/validator/map-type-validator');
const { SpotsValidator } = require('../../lib/validator/spots-validator');
const { GeneratorClassesValidator } = require('../../lib/validator/generator-classes-validator');

class TestCompleteWorkflows extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.elementPlacementValidator = new ElementPlacementValidator();
        this.pathConnectivityValidator = new PathConnectivityValidator();
        this.wallsValidator = new WallsValidator();
        this.groundVariationsValidator = new GroundVariationsValidator();
        this.freeSpaceValidator = new FreeSpaceValidator();
        this.mapTypeValidator = new MapTypeValidator();
        this.spotsValidator = new SpotsValidator();
        this.generatorClassesValidator = new GeneratorClassesValidator();
        this.allValidators = [
            this.elementPlacementValidator,
            this.pathConnectivityValidator,
            this.wallsValidator,
            this.groundVariationsValidator,
            this.freeSpaceValidator,
            this.mapTypeValidator,
            this.spotsValidator
        ];
    }

    async testBoundaryConditions()
    {
        let minimalConfig = this.setupBasicConfig();
        minimalConfig.layerElements = {};
        minimalConfig.elementsQuantity = {dummy: 0};
        await this.testWithDeterministicSeed('Boundary conditions', minimalConfig, 55443, async (map, config) => {
            let boundaryResults = {
                isValid: true,
                mapGenerated: false,
                validStructure: false
            };
            if(!map){
                boundaryResults.isValid = false;
                this.logFunctionalityResult('Boundary Conditions', boundaryResults);
                this.assert(boundaryResults.isValid, 'Boundary conditions must be handled');
                return;
            }
            boundaryResults.mapGenerated = true;
            this.assertValidMapStructure(map);
            boundaryResults.validStructure = true;
            this.logFunctionalityResult('Boundary Conditions', boundaryResults);
            this.assert(boundaryResults.isValid, 'Boundary conditions must be handled');
        });
    }

    async testErrorConditions()
    {
        let invalidConfigs = [
            {name: 'missing-ground-tile', config: {...this.setupBasicConfig(), groundTile: undefined}},
            {name: 'invalid-elements-quantity', config: {...this.setupBasicConfig(), elementsQuantity: 'invalid'}},
            {name: 'missing-layer-elements', config: {...this.setupBasicConfig(), layerElements: null}}
        ];
        for(let invalidConfig of invalidConfigs){
            await this.test('Error condition: '+invalidConfig.name, async () => {
                try {
                    let map = await this.testCurrentGeneration(invalidConfig.config);
                    if(map){
                        this.assert(false, 'Invalid config should not generate map: '+invalidConfig.name);
                        return;
                    }
                } catch(error) {
                    this.logFunctionalityResult('Error Condition '+invalidConfig.name, {
                        isValid: true,
                        errorHandled: true,
                        errorMessage: error.message
                    });
                }
            });
        }
    }

    async testPerformanceRegression()
    {
        let performanceConfig = this.setupBasicConfig();
        performanceConfig.elementsQuantity = {house1: 3, tree: 5};
        performanceConfig.freeSpaceTilesQuantity = 5;
        let performanceResults = [];
        for(let i = 0; i < 3; i++){
            let startTime = Date.now();
            await this.testWithDeterministicSeed('Performance test '+i, performanceConfig, 12300 + i, async (map, config) => {
                let endTime = Date.now();
                let duration = endTime - startTime;
                performanceResults.push(duration);
                this.assert(map, 'Map must be generated for performance test');
                this.assert(15000 > duration, 'Generation must complete within 15 seconds');
            });
        }
        let averageTime = performanceResults.reduce((sum, time) => sum + time, 0) / performanceResults.length;
        this.logFunctionalityResult('Performance Regression', {
            isValid: 10000 > averageTime,
            averageTime,
            allTimes: performanceResults,
            threshold: 10000
        });
    }

}

module.exports.TestCompleteWorkflows = TestCompleteWorkflows;
