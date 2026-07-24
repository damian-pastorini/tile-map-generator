/**
 *
 * Reldens - Test Path Connectivity
 *
 */

const { BaseFunctionalityTest } = require('../base-functionality-test');
const { PathConnectivityValidator } = require('../../lib/validator/path-connectivity-validator');

class TestPathConnectivity extends BaseFunctionalityTest
{

    constructor()
    {
        super();
        this.pathConnectivityValidator = new PathConnectivityValidator();
    }

    async testPathConnectivityComplete()
    {
        let config = this.setupComplexConfig();
        config.mainPathSize = 5;
        await this.testWithDeterministicSeed('Path connectivity complete', config, 56789, async (map, config) => {
            let validation = this.pathConnectivityValidator.validatePathConnectivity(map, config);
            this.logFunctionalityResult('Path Connectivity Complete', validation);
            this.assert(validation.isValid, 'Path must be fully connected');
            this.assert(validation.fullyConnected, 'All path tiles must form single component');
            this.assert(1 === validation.componentCount, 'Must have exactly one connected component');
            this.assert(0 === validation.isolatedNodes, 'No isolated path nodes allowed');
        });
    }

    async testElementReachabilityFromMainPath()
    {
        let config = this.setupComplexConfig();
        config.mainPathSize = 3;
        config.generateElementsPath = true;
        await this.testWithDeterministicSeed('Element reachability from main path', config, 78901, async (map, config) => {
            let validation = this.pathConnectivityValidator.validateElementReachability(map, config);
            this.logFunctionalityResult('Element Reachability', validation);
            this.assert(validation.isValid, 'All elements must be reachable from main path');
            this.assert(0 === validation.unreachableElements, 'No unreachable elements allowed');
            this.assert(100 === validation.reachabilityPercentage, 'Reachability must be 100%');
            this.assert(0 === validation.unreachableList.length, 'Unreachable list must be empty');
        });
    }

    async testPathContinuityNoGaps()
    {
        let config = this.setupComplexConfig();
        config.mainPathSize = 4;
        await this.testWithDeterministicSeed('Path continuity no gaps', config, 23456, async (map, config) => {
            let validation = this.pathConnectivityValidator.validatePathContinuity(map, config);
            this.logFunctionalityResult('Path Continuity No Gaps', validation);
            this.assert(validation.isValid, 'Path must be continuous without gaps');
            this.assert(validation.continuousPath, 'Path must be continuous');
            this.assert(1 === validation.pathSegments, 'Must have single path segment');
            this.assert(0 === validation.isolatedSegments, 'No isolated path segments allowed');
            if(validation.gapAnalysis){
                this.assert(0 === validation.gapAnalysis.totalGaps, 'No gaps allowed in path');
            }
        });
    }

    async testPathWidthConsistency()
    {
        let config = this.setupComplexConfig();
        config.pathSize = 1;
        config.mainPathSize = 3;
        await this.testWithDeterministicSeed('Path width consistency', config, 34567, async (map, config) => {
            let validation = this.pathConnectivityValidator.validatePathWidthConsistency(map, config, 10);
            this.logFunctionalityResult('Path Width Consistency', validation);
            this.assert(validation.isValid, 'Path width must be consistent');
            this.assert(config.pathSize === validation.expectedWidth, 'Expected width must match configuration');
        });
    }

    async testMainPathBorderPlacement()
    {
        let config = this.setupComplexConfig();
        config.mainPathSize = 6;
        config.blockMapBorder = true;
        await this.testWithDeterministicSeed('Main path border placement', config, 45678, async (map, config) => {
            let validation = this.pathConnectivityValidator.validatePathConnectivity(map, config);
            this.logFunctionalityResult('Main Path Border Placement', validation);
            this.assert(validation.isValid, 'Main path must be properly connected');
            this.assert(0 < validation.totalPathNodes, 'Must have path nodes');
            let mainPathPositions = this.pathConnectivityValidator.findMainPathPositions(map, config);
            this.assert(0 < mainPathPositions.length, 'Must find main path positions');
            for(let pos of mainPathPositions){
                let isBorderPosition = 0 === pos.x || 0 === pos.y || pos.x === map.width - 1 || pos.y === map.height - 1;
                this.assert(isBorderPosition, 'Main path position must be on border');
            }
        });
    }

    async testSingleTilePathConfiguration()
    {
        let config = this.setupBasicConfig();
        config.pathSize = 1;
        config.mainPathSize = 2;
        await this.testWithDeterministicSeed('Single tile path configuration', config, 67890, async (map, config) => {
            let validation = this.pathConnectivityValidator.validatePathWidthConsistency(map, config, 10);
            this.logFunctionalityResult('Single Tile Path Configuration', validation);
            this.assert(validation.isValid, 'Single tile path must be valid');
            this.assert(1 === validation.expectedWidth, 'Expected width must be 1');
        });
    }

    async testNoPathConfiguration()
    {
        let config = this.setupBasicConfig();
        config.pathTile = 0;
        config.mainPathSize = 0;
        await this.testWithDeterministicSeed('No path configuration', config, 89012, async (map, config) => {
            let validation = this.pathConnectivityValidator.validatePathConnectivity(map, config);
            this.logFunctionalityResult('No Path Configuration', validation);
            this.assert(validation.isValid, 'No path configuration must be valid');
            this.assert('No path tile configured' === validation.reason, 'Must indicate no path configured');
        });
    }

    async testPathIsolationDetection()
    {
        let config = this.setupComplexConfig();
        config.mainPathSize = 2;
        config.generateElementsPath = false;
        await this.testWithDeterministicSeed('Path isolation detection', config, 12345, async (map, config) => {
            let validation = this.pathConnectivityValidator.validatePathContinuity(map, config);
            let testResult = {
                isValid: true,
                reason: 'Path isolation detection completed successfully'
            };
            if(!validation.isValid){
                if(validation.gapAnalysis){
                    this.assert(0 < validation.gapAnalysis.totalGaps, 'Must detect path gaps if invalid');
                    for(let gap of validation.gapAnalysis.gaps){
                        this.assert(gap.position, 'Gap must have position');
                        this.assert(gap.reason, 'Gap must have reason');
                    }
                    testResult.reason = 'Path isolation detected and validated: '+validation.gapAnalysis.totalGaps+' gaps found';
                }
            }
            if(validation.isValid){
                testResult.reason = 'No path isolation detected - path is properly connected';
            }
            this.logFunctionalityResult('Path Isolation Detection', testResult);
        });
    }

}

module.exports.TestPathConnectivity = TestPathConnectivity;
