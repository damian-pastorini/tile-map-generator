/**
 *
 * Reldens - Test Free Space Validator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { FreeSpaceValidator } = require('../lib/validator/free-space-validator');

class TestFreeSpaceValidator extends BaseMapGeneratorTest
{

    buildMapWithTrees(treeAData, treeBData)
    {
        let layers = [];
        layers.push({name: 'tree0-below-player', type: 'tilelayer', width: 6, height: 6, data: treeAData});
        layers.push({name: 'tree1-below-player', type: 'tilelayer', width: 6, height: 6, data: treeBData});
        return {width: 6, height: 6, layers};
    }

    gridWithTile(index)
    {
        let data = new Array(36).fill(0);
        data[index] = 100;
        return data;
    }

    async testNoElementsPasses()
    {
        await this.test('No element positions passes free space minimums', async () => {
            let validator = new FreeSpaceValidator();
            let map = {width: 4, height: 4, layers: []};
            let result = validator.validateFreeSpaceMinimums(map, {elementsQuantity: {tree: 1}});
            this.assert(true === result.isValid, 'No elements should pass');
            this.assertEqual(result.reason, 'No elements to validate', 'Expected no elements reason');
        });
    }

    async testFreeSpaceMinimumsValid()
    {
        await this.test('Distant elements pass free space minimums', async () => {
            let validator = new FreeSpaceValidator();
            let map = this.buildMapWithTrees(this.gridWithTile(0), this.gridWithTile(35));
            let config = {elementsQuantity: {tree: 2}, elementsFreeSpaceAround: {tree: 2}};
            let result = validator.validateFreeSpaceMinimums(map, config);
            this.assert(true === result.isValid, 'Far apart elements should pass');
            this.assertEqual(result.violatedDistances, 0, 'No violations expected');
        });
    }

    async testFreeSpaceMinimumsViolated()
    {
        await this.test('Adjacent elements violate free space minimums', async () => {
            let validator = new FreeSpaceValidator();
            let map = this.buildMapWithTrees(this.gridWithTile(0), this.gridWithTile(1));
            let config = {elementsQuantity: {tree: 2}, elementsFreeSpaceAround: {tree: 3}};
            let result = validator.validateFreeSpaceMinimums(map, config);
            this.assert(false === result.isValid, 'Adjacent elements should violate');
            this.assert(0 < result.violatedDistances, 'Violation should be counted');
        });
    }

    async testNoPathTileSkipsPathValidation()
    {
        await this.test('Missing pathTile skips paths in free space validation', async () => {
            let validator = new FreeSpaceValidator();
            let map = this.buildMapWithTrees(this.gridWithTile(0), this.gridWithTile(35));
            let result = validator.validatePathsInFreeSpace(map, {elementsQuantity: {tree: 2}});
            this.assert(true === result.isValid, 'No path tile should pass');
            this.assertEqual(result.reason, 'No path tile configured', 'Expected no path tile reason');
        });
    }

    async testResolveElementFreeSpace()
    {
        await this.test('resolveElementFreeSpace prefers per-element value then default', async () => {
            let validator = new FreeSpaceValidator();
            let config = {elementsFreeSpaceAround: {tree: 3}, minimumElementsFreeSpaceAround: 1};
            this.assertEqual(validator.resolveElementFreeSpace(config, 'tree'), 3, 'Per-element free space expected');
            this.assertEqual(validator.resolveElementFreeSpace(config, 'rock'), 1, 'Default free space expected');
        });
    }

    async testResolveAllowPathsInFreeSpace()
    {
        await this.test('resolveAllowPathsInFreeSpace prefers per-element flag then default', async () => {
            let validator = new FreeSpaceValidator();
            let config = {elementsAllowPathsInFreeSpace: {tree: false}, defaultElementsAllowPathsInFreeSpace: true};
            this.assert(false === validator.resolveAllowPathsInFreeSpace(config, 'tree'), 'Per-element flag expected');
            this.assert(true === validator.resolveAllowPathsInFreeSpace(config, 'rock'), 'Default flag expected');
        });
    }

    async testGetAllowedTilesInFreeSpace()
    {
        await this.test('getAllowedTilesInFreeSpace includes path tile only when allowed', async () => {
            let validator = new FreeSpaceValidator();
            let allowConfig = {groundTile: 116, pathTile: 121, defaultElementsAllowPathsInFreeSpace: true};
            let allowed = validator.getAllowedTilesInFreeSpace({elementType: 'tree'}, allowConfig);
            this.assert(-1 !== allowed.indexOf(116), 'Ground tile should be allowed');
            this.assert(-1 !== allowed.indexOf(121), 'Path tile should be allowed when paths permitted');
            let denyConfig = {
                groundTile: 116,
                pathTile: 121,
                elementsAllowPathsInFreeSpace: {tree: false},
                defaultElementsAllowPathsInFreeSpace: true
            };
            let denied = validator.getAllowedTilesInFreeSpace({elementType: 'tree'}, denyConfig);
            this.assertEqual(denied.indexOf(121), -1, 'Path tile should be excluded when paths denied');
        });
    }

    async testIsTileAllowedInFreeSpace()
    {
        await this.test('isTileAllowedInFreeSpace rejects disallowed tiles across layers', async () => {
            let validator = new FreeSpaceValidator();
            let blocker = new Array(36).fill(0);
            blocker[15] = 999;
            let map = {width: 6, height: 6, layers: [{name: 'blocker', type: 'tilelayer', data: blocker}]};
            this.assert(false === validator.isTileAllowedInFreeSpace(3, 2, map, [0, 116]), 'Disallowed tile rejected');
            this.assert(true === validator.isTileAllowedInFreeSpace(0, 0, map, [0, 116]), 'Empty cell allowed');
        });
    }

    async testIterateFreeSpaceCellsSkipsElementTiles()
    {
        await this.test('iterateFreeSpaceCells visits the ring around the element only', async () => {
            let validator = new FreeSpaceValidator();
            let map = {width: 6, height: 6, layers: []};
            let visited = 0;
            validator.iterateFreeSpaceCells({x: 2, y: 2, width: 1, height: 1}, 1, map, () => {
                visited++;
            });
            this.assertEqual(visited, 8, 'Eight surrounding cells expected for radius 1');
        });
    }

    async testValidateFreeSpaceBoundariesValid()
    {
        await this.test('Clear surroundings pass free space boundaries validation', async () => {
            let validator = new FreeSpaceValidator();
            let treeData = this.gridWithTile(14);
            let map = {
                width: 6,
                height: 6,
                layers: [{name: 'tree0-below-player', type: 'tilelayer', width: 6, height: 6, data: treeData}]
            };
            let config = {elementsQuantity: {tree: 1}, groundTile: 116, elementsFreeSpaceAround: {tree: 1}};
            let result = validator.validateFreeSpaceBoundaries(map, config);
            this.assert(true === result.isValid, 'Clear free space should pass');
            this.assertEqual(result.validBoundaries, 1, 'One valid boundary expected');
        });
    }

    async testValidateFreeSpaceBoundariesViolation()
    {
        await this.test('Disallowed tile inside free space fails boundaries validation', async () => {
            let validator = new FreeSpaceValidator();
            let treeData = this.gridWithTile(14);
            let blocker = new Array(36).fill(0);
            blocker[15] = 999;
            let map = {
                width: 6,
                height: 6,
                layers: [
                    {name: 'tree0-below-player', type: 'tilelayer', width: 6, height: 6, data: treeData},
                    {name: 'blocker', type: 'tilelayer', width: 6, height: 6, data: blocker}
                ]
            };
            let config = {elementsQuantity: {tree: 1}, groundTile: 116, elementsFreeSpaceAround: {tree: 1}};
            let result = validator.validateFreeSpaceBoundaries(map, config);
            this.assert(false === result.isValid, 'Blocked free space should fail');
            this.assertEqual(result.invalidBoundaries, 1, 'One invalid boundary expected');
        });
    }

    buildPathFreeSpaceCase()
    {
        let testCase = {
            map: {width: 6, height: 6, layers: [{name: 'path', type: 'tilelayer', data: new Array(36).fill(0)}]},
            config: {pathTile: 121, elementsFreeSpaceAround: {tree: 1}},
            element: {x: 2, y: 2, width: 1, height: 1, elementType: 'tree'}
        };
        testCase.map.layers[0].data[15] = 121;
        return testCase;
    }

    async testValidatePathsForElementNotAllowed()
    {
        await this.test('Path inside free space fails when paths are not allowed', async () => {
            let validator = new FreeSpaceValidator();
            let testCase = this.buildPathFreeSpaceCase();
            let result = validator.validatePathsForElement(testCase.element, testCase.map, testCase.config, false);
            this.assert(false === result.isValid, 'Disallowed path in free space should fail');
            this.assertEqual(result.violations.length, 1, 'One path violation expected');
        });
    }

    async testValidatePathsForElementAllowed()
    {
        await this.test('Path inside free space passes when paths are allowed', async () => {
            let validator = new FreeSpaceValidator();
            let testCase = this.buildPathFreeSpaceCase();
            let result = validator.validatePathsForElement(testCase.element, testCase.map, testCase.config, true);
            this.assert(true === result.isValid, 'Allowed path in free space should pass');
            this.assertEqual(result.violations.length, 0, 'No violations expected when paths allowed');
        });
    }

    async testValidatePathsForElementNoPathLayer()
    {
        await this.test('Missing path layer short-circuits validatePathsForElement', async () => {
            let validator = new FreeSpaceValidator();
            let map = {width: 6, height: 6, layers: []};
            let element = {x: 2, y: 2, width: 1, height: 1, elementType: 'tree'};
            let result = validator.validatePathsForElement(element, map, {pathTile: 121}, false);
            this.assert(true === result.isValid, 'Missing path layer should pass');
            this.assertEqual(result.reason, 'No path layer found', 'Expected missing path layer reason');
        });
    }

    async testPerformValidationPasses()
    {
        await this.test('Full free space validation passes for a single isolated element', async () => {
            let validator = new FreeSpaceValidator();
            let treeData = new Array(16).fill(0);
            treeData[5] = 100;
            let map = {
                type: 'map',
                width: 4,
                height: 4,
                layers: [{name: 'tree0-below-player', type: 'tilelayer', width: 4, height: 4, data: treeData}]
            };
            let config = {elementsQuantity: {tree: 1}, groundTile: 116};
            let result = validator.validateMap(map, config);
            this.assert(true === result, 'Single isolated element should pass full free space validation');
        });
    }

}

module.exports.TestFreeSpaceValidator = TestFreeSpaceValidator;
