/**
 *
 * Reldens - Test Path Expander
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PathExpander } = require('../lib/generator/path-expander');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class TestPathExpander extends BaseMapGeneratorTest
{

    buildScenario(collisionPredicate)
    {
        let mapGridBuilder = {isOccupiedByAnotherCollision: collisionPredicate};
        let expander = new PathExpander(new LayerDataFactory(), mapGridBuilder);
        let pathLayerData = new Array(9).fill(0);
        pathLayerData[4] = 7;
        let grid = [];
        for(let row = 0; row < 3; row++){
            grid.push(new Array(3).fill(true));
        }
        return {expander, pathLayerData, grid};
    }

    async testExpandSingleSizeIsNoOp()
    {
        await this.test('Expand with pathSize 1 returns original data', async () => {
            let scenario = this.buildScenario(() => false);
            let result = scenario.expander.expand(scenario.pathLayerData, 3, 3, [], scenario.grid, 1, 7);
            this.assertEqual(result[4], 7, 'Center should remain path');
            this.assertEqual(result[1], 0, 'Neighbor should not be expanded');
            this.assertEqual(result[3], 0, 'Neighbor should not be expanded');
        });
    }

    async testExpandOneLevelToNeighbors()
    {
        await this.test('Expand pathSize 2 fills the four orthogonal neighbors', async () => {
            let scenario = this.buildScenario(() => false);
            let result = scenario.expander.expand(scenario.pathLayerData, 3, 3, [], scenario.grid, 2, 7);
            this.assertEqual(result[1], 7, 'Top neighbor expanded');
            this.assertEqual(result[3], 7, 'Left neighbor expanded');
            this.assertEqual(result[5], 7, 'Right neighbor expanded');
            this.assertEqual(result[7], 7, 'Bottom neighbor expanded');
            this.assertEqual(result[0], 0, 'Diagonal not expanded');
            this.assertEqual(result[4], 7, 'Center still path');
        });
    }

    async testExpandRespectsNonWalkableGrid()
    {
        await this.test('Expand does not write into non-walkable cells', async () => {
            let scenario = this.buildScenario(() => false);
            scenario.grid[0][1] = false;
            let result = scenario.expander.expand(scenario.pathLayerData, 3, 3, [], scenario.grid, 2, 7);
            this.assertEqual(result[1], 0, 'Top neighbor blocked by non-walkable grid');
            this.assertEqual(result[3], 7, 'Left neighbor expanded');
        });
    }

    async testExpandRespectsCollisionStub()
    {
        await this.test('Expand skips neighbors reported as occupied by collisions', async () => {
            let scenario = this.buildScenario((collisionX, collisionY) => 2 === collisionX && 1 === collisionY);
            let result = scenario.expander.expand(scenario.pathLayerData, 3, 3, [], scenario.grid, 2, 7);
            this.assertEqual(result[5], 0, 'Right neighbor blocked by collision');
            this.assertEqual(result[3], 7, 'Left neighbor expanded');
        });
    }

}

module.exports.TestPathExpander = TestPathExpander;
