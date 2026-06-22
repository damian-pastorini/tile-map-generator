/**
 *
 * Reldens - Test Path Connectivity Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PathConnectivityValidator } = require('../lib/validator/path-connectivity-validator');

class TestPathConnectivityValidator extends BaseMapGeneratorTest
{

    async testNoPathTilePasses()
    {
        await this.test('No path tile passes connectivity validation', async () => {
            let validator = new PathConnectivityValidator();
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validatePathConnectivity(map, {pathTile: 0});
            this.assert(true === result.isValid, 'No path tile should pass');
            this.assertEqual(result.reason, 'No path tile configured', 'Expected no path tile reason');
        });
    }

    async testPathLayerMissingFails()
    {
        await this.test('Missing path layer fails connectivity validation', async () => {
            let validator = new PathConnectivityValidator();
            let map = {width: 4, height: 4, layers: [{name: 'ground', type: 'tilelayer', data: new Array(16).fill(0)}]};
            let result = validator.validatePathConnectivity(map, {pathTile: 121});
            this.assert(false === result.isValid, 'Missing path layer should fail');
            this.assertEqual(result.reason, 'Path layer not found', 'Expected missing path layer reason');
        });
    }

    async testPathContinuityIsolatedTileFails()
    {
        await this.test('Isolated path tile fails path continuity gap analysis', async () => {
            let validator = new PathConnectivityValidator();
            let data = new Array(16).fill(0);
            data[5] = 121;
            let map = {width: 4, height: 4, layers: [{name: 'path', type: 'tilelayer', data}]};
            let result = validator.analyzePathGaps(map, {pathTile: 121});
            this.assert(false === result.isValid, 'Isolated path tile should fail');
            this.assertEqual(result.totalGaps, 1, 'One gap expected');
        });
    }

    async testPathContinuityConnectedPasses()
    {
        await this.test('Adjacent path tiles pass gap analysis', async () => {
            let validator = new PathConnectivityValidator();
            let data = new Array(16).fill(0);
            data[5] = 121;
            data[6] = 121;
            let map = {width: 4, height: 4, layers: [{name: 'path', type: 'tilelayer', data}]};
            let result = validator.analyzePathGaps(map, {pathTile: 121});
            this.assert(true === result.isValid, 'Connected path tiles should pass');
            this.assertEqual(result.totalGaps, 0, 'No gaps expected');
        });
    }

    async testPathWidthRequiresTolerance()
    {
        await this.test('Path width consistency requires tolerance parameter', async () => {
            let validator = new PathConnectivityValidator();
            let map = {width: 4, height: 4, layers: [{name: 'path', type: 'tilelayer', data: new Array(16).fill(0)}]};
            let result = validator.validatePathWidthConsistency(map, {pathTile: 121});
            this.assert(false === result.isValid, 'Missing tolerance should fail');
            this.assertEqual(result.reason, 'tolerance parameter is required', 'Expected tolerance required reason');
        });
    }

}

module.exports.TestPathConnectivityValidator = TestPathConnectivityValidator;
