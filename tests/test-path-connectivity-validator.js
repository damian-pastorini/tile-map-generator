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

    buildConnectedRowMap()
    {
        let layers = [];
        layers.push({name: 'path', type: 'tilelayer', data: [121, 121, 121, 121]});
        return {width: 4, height: 1, layers};
    }

    buildHorizontalLineData()
    {
        let data = new Array(9).fill(0);
        data[3] = 121;
        data[4] = 121;
        data[5] = 121;
        return data;
    }

    buildHorizontalLineMap()
    {
        let layers = [];
        layers.push({name: 'path', type: 'tilelayer', data: this.buildHorizontalLineData()});
        return {width: 3, height: 3, layers};
    }

    async testValidatePathConnectivityConnected()
    {
        await this.test('Fully connected path passes connectivity validation', async () => {
            let validator = new PathConnectivityValidator();
            let result = validator.validatePathConnectivity(this.buildConnectedRowMap(), {pathTile: 121});
            this.assert(true === result.isValid, 'Connected path should pass');
            this.assertEqual(result.totalPathNodes, 4, 'Four path nodes expected');
            this.assertEqual(result.componentCount, 1, 'Single connected component expected');
        });
    }

    async testValidatePathContinuityConnected()
    {
        await this.test('Continuous path passes continuity validation', async () => {
            let validator = new PathConnectivityValidator();
            let result = validator.validatePathContinuity(this.buildConnectedRowMap(), {pathTile: 121});
            this.assert(true === result.isValid, 'Continuous path should pass');
            this.assertEqual(result.pathSegments, 1, 'One path segment expected');
            this.assertEqual(result.isolatedSegments, 0, 'No isolated segments expected');
        });
    }

    async testValidatePathContinuityDisconnectedFails()
    {
        await this.test('Disconnected path segments fail continuity validation', async () => {
            let validator = new PathConnectivityValidator();
            let data = [121, 0, 0, 0, 121];
            let map = {width: 5, height: 1, layers: [{name: 'path', type: 'tilelayer', data}]};
            let result = validator.validatePathContinuity(map, {pathTile: 121});
            this.assert(false === result.isValid, 'Two disconnected tiles should fail');
        });
    }

    async testFindMainPathPositionsBorder()
    {
        await this.test('findMainPathPositions returns border path tiles when present', async () => {
            let validator = new PathConnectivityValidator();
            let data = new Array(9).fill(0);
            data[0] = 121;
            data[1] = 121;
            data[2] = 121;
            data[4] = 121;
            let map = {width: 3, height: 3, layers: [{name: 'path', type: 'tilelayer', data}]};
            let result = validator.findMainPathPositions(map, {pathTile: 121, mainPathSize: 2});
            this.assertEqual(result.length, 3, 'Three border path tiles expected');
            let allBorder = result.every(pos => 0 === pos.x || 0 === pos.y || 2 === pos.x || 2 === pos.y);
            this.assert(true === allBorder, 'All returned positions should be on the border');
        });
    }

    async testFindMainPathPositionsFallback()
    {
        await this.test('findMainPathPositions falls back to slice when no border tiles', async () => {
            let validator = new PathConnectivityValidator();
            let data = new Array(9).fill(0);
            data[4] = 121;
            let map = {width: 3, height: 3, layers: [{name: 'path', type: 'tilelayer', data}]};
            let result = validator.findMainPathPositions(map, {pathTile: 121, mainPathSize: 2});
            this.assertEqual(result.length, 1, 'Single central path tile expected via fallback');
            this.assertEqual(result[0].x, 1, 'Central tile x expected');
            this.assertEqual(result[0].y, 1, 'Central tile y expected');
        });
    }

    async testFindMainPathPositionsNoMainPathSize()
    {
        await this.test('findMainPathPositions returns empty when mainPathSize is zero', async () => {
            let validator = new PathConnectivityValidator();
            let result = validator.findMainPathPositions(this.buildConnectedRowMap(), {pathTile: 121, mainPathSize: 0});
            this.assertEqual(result.length, 0, 'No positions expected without mainPathSize');
        });
    }

    async testFindNearestPathPosition()
    {
        await this.test('findNearestPathPosition returns the closest path tile', async () => {
            let validator = new PathConnectivityValidator();
            let data = [121, 0, 121];
            let map = {width: 3, height: 1, layers: [{name: 'path', type: 'tilelayer', data}]};
            let nearest = validator.findNearestPathPosition({x: 2, y: 0}, map, 121);
            this.assertEqual(nearest.x, 2, 'Nearest path tile x expected');
            let noLayer = validator.findNearestPathPosition({x: 0, y: 0}, {width: 3, height: 1, layers: []}, 121);
            this.assertEqual(noLayer, null, 'Missing path layer should return null');
        });
    }

    async testFindAllElementPositions()
    {
        await this.test('findAllElementPositions gathers configured element positions', async () => {
            let validator = new PathConnectivityValidator();
            let treeData = new Array(16).fill(0);
            treeData[5] = 100;
            let map = {
                width: 4,
                height: 4,
                layers: [{name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 4, data: treeData}]
            };
            let result = validator.findAllElementPositions(map, {elementsQuantity: {tree: 1}});
            this.assertEqual(result.length, 1, 'One element position expected');
            this.assertEqual(result[0].elementType, 'tree', 'Element type should be tagged');
        });
    }

    async testCreatePathfindingGrid()
    {
        await this.test('createPathfindingGrid builds a grid with path tiles walkable', async () => {
            let validator = new PathConnectivityValidator();
            let grid = validator.createPathfindingGrid(this.buildConnectedRowMap(), 121);
            this.assertEqual(grid.width, 4, 'Grid width should match the map');
            this.assertEqual(grid.height, 1, 'Grid height should match the map');
            this.assert(true === grid.isWalkableAt(2, 0), 'Path tile should be walkable');
        });
    }

    async testValidateElementReachabilityNoPathConfigured()
    {
        await this.test('Element reachability passes when no path tile is configured', async () => {
            let validator = new PathConnectivityValidator();
            let result = validator.validateElementReachability({width: 4, height: 1, layers: []}, {pathTile: 0});
            this.assert(true === result.isValid, 'No path tile should pass reachability');
            this.assertEqual(result.reason, 'No path configured', 'Expected no path configured reason');
        });
    }

    async testValidateElementReachabilityNoMainPathFails()
    {
        await this.test('Element reachability fails when there is no main path', async () => {
            let validator = new PathConnectivityValidator();
            let config = {pathTile: 121, elementsQuantity: {tree: 1}, mainPathSize: 0};
            let result = validator.validateElementReachability(this.buildConnectedRowMap(), config);
            this.assert(false === result.isValid, 'Missing main path should fail');
            this.assertEqual(result.reason, 'No main path found', 'Expected no main path reason');
        });
    }

    async testValidateElementReachabilityReachable()
    {
        await this.test('Element next to a connected path is reported reachable', async () => {
            let validator = new PathConnectivityValidator();
            let pathData = [121, 121, 121, 121];
            let treeData = [0, 0, 0, 100];
            let map = {
                width: 4,
                height: 1,
                layers: [
                    {name: 'path', type: 'tilelayer', width: 4, height: 1, data: pathData},
                    {name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 1, data: treeData}
                ]
            };
            let config = {pathTile: 121, elementsQuantity: {tree: 1}, mainPathSize: 2};
            let result = validator.validateElementReachability(map, config);
            this.assert(true === result.isValid, 'Element near path should be reachable');
            this.assertEqual(result.reachableElements, 1, 'One reachable element expected');
        });
    }

    async testMeasurePathWidth()
    {
        await this.test('Local path width math measures a one-wide horizontal line', async () => {
            let validator = new PathConnectivityValidator();
            let data = this.buildHorizontalLineData();
            let horizontal = validator.measureHorizontalPathWidth({x: 1, y: 1}, data, 3, 3, 121);
            this.assertEqual(horizontal, 3, 'Horizontal extent of three tiles expected');
            let local = validator.calculateLocalPathWidth({x: 1, y: 1}, data, 3, 3, 121);
            this.assertEqual(local, 1, 'Local width is the thinner vertical extent');
        });
    }

    async testValidatePathWidthConsistencyPasses()
    {
        await this.test('One-wide path passes width consistency for pathSize 1', async () => {
            let validator = new PathConnectivityValidator();
            let result = validator.validatePathWidthConsistency(this.buildHorizontalLineMap(), {pathTile: 121, pathSize: 1}, 0);
            this.assert(true === result.isValid, 'Consistent one-wide path should pass');
            this.assertEqual(result.totalPositions, 3, 'Three path positions expected');
            this.assertEqual(result.violationCount, 0, 'No width violations expected');
        });
    }

    async testValidatePathWidthConsistencyFails()
    {
        await this.test('One-wide path fails width consistency when pathSize is two', async () => {
            let validator = new PathConnectivityValidator();
            let result = validator.validatePathWidthConsistency(this.buildHorizontalLineMap(), {pathTile: 121, pathSize: 2}, 0);
            this.assert(false === result.isValid, 'Width mismatch should fail');
            this.assertEqual(result.violationCount, 3, 'All three positions should violate');
        });
    }

    async testPerformValidationStopsWithoutTolerance()
    {
        await this.test('performValidation stops at the width step that needs a tolerance', async () => {
            let validator = new PathConnectivityValidator();
            let result = validator.performValidation(this.buildConnectedRowMap(), {pathTile: 121, mainPathSize: 2});
            this.assert(false === result, 'Width step without tolerance makes the pipeline fail');
        });
    }

}

module.exports.TestPathConnectivityValidator = TestPathConnectivityValidator;
