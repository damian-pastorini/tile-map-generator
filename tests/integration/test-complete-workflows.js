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

    async testCompleteValidationWorkflow()
    {
        let config = this.setupBasicConfig();
        config.applyPathsInnerWalls = true;
        config.variableTilesPercentage = 10;
        config.randomGroundTiles = [26, 27, 28];
        config.elementsQuantity = {house1: 2, tree: 3};
        config.freeSpaceTilesQuantity = 5;
        config.groundSpots = {
            'workflow-test-spot': {
                quantity: 1,
                width: 4,
                height: 4,
                walkable: false,
                layerName: 'ground-spot-workflow-test',
                tilesKey: 'workflow-test-spot',
                spotTile: 116,
                borderInnerWalls: true,
                borderOuterWalls: true,
                applyCornersTiles: true,
                spotLayers: {'workflow-test-layer': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]}
            }
        };
        await this.testWithDeterministicSeed('Complete validation workflow', config, 99887, async (map, config) => {
            let workflowResults = {
                isValid: true,
                validatorResults: {},
                totalValidators: this.allValidators.length,
                passedValidators: 0,
                failedValidators: 0
            };
            for(let validator of this.allValidators){
                let validatorName = validator.constructor.name;
                let result = validator.validateMap(map, config);
                workflowResults.validatorResults[validatorName] = result;
                if(!result){
                    workflowResults.failedValidators++;
                    workflowResults.isValid = false;
                    continue;
                }
                workflowResults.passedValidators++;
            }
            this.logFunctionalityResult('Complete Validation Workflow', workflowResults);
            this.assert(workflowResults.isValid, 'All validators must pass in complete workflow');
            this.assertEqual(workflowResults.failedValidators, 0, 'No validator failures allowed');
            this.assertEqual(workflowResults.passedValidators, workflowResults.totalValidators, 'All validators must pass');
        });
    }

    async testFeatureCombinationsEdgeCases()
    {
        let config = this.setupBasicConfig();
        config.blockMapBorder = true;
        config.entryPosition = 'top-middle';
        config.entryPositionSize = 2;
        config.applyPathsInnerWalls = true;
        config.applyPathsOuterWalls = true;
        config.variableTilesPercentage = 15;
        config.elementsQuantity = {house1: 1, tree: 2};
        config.elementsFreeSpaceAround = {house1: 3, tree: 1};
        config.mapCenteredElements = {house1: 1};
        config.freeSpaceTilesQuantity = 3;
        config.groundSpots = {
            'edge-case-spot': {
                quantity: 1,
                width: 3,
                height: 3,
                walkable: false,
                layerName: 'ground-spot-edge-case',
                tilesKey: 'edge-case-spot',
                spotTile: 116,
                borderInnerWalls: true,
                borderOuterWalls: true,
                applyCornersTiles: true,
                spotLayers: {'edge-case-layer': [1,2,3,4,5,6,7,8,9]}
            }
        };
        await this.testWithDeterministicSeed('Feature combinations edge cases', config, 77665, async (map, config) => {
            let combinationResults = {};
            combinationResults.elementPlacement = this.elementPlacementValidator.validateMap(map, config);
            combinationResults.pathConnectivity = this.pathConnectivityValidator.validateMap(map, config);
            combinationResults.wallsGeneration = this.wallsValidator.validateMap(map, config);
            combinationResults.freeSpace = this.freeSpaceValidator.validateMap(map, config);
            combinationResults.mapType = this.mapTypeValidator.validateMap(map, config);
            let allPassed = Object.values(combinationResults).every(result => result);
            this.logFunctionalityResult('Feature Combinations Edge Cases', {
                isValid: allPassed,
                results: combinationResults
            });
            this.assert(allPassed, 'All feature combinations must work together');
        });
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
