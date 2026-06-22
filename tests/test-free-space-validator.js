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
        return {
            width: 6,
            height: 6,
            layers: [
                {name: 'tree0-below-player', type: 'tilelayer', width: 6, height: 6, data: treeAData},
                {name: 'tree1-below-player', type: 'tilelayer', width: 6, height: 6, data: treeBData}
            ]
        };
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

}

module.exports.TestFreeSpaceValidator = TestFreeSpaceValidator;
