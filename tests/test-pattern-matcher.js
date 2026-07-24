/**
 *
 * Reldens - Test Pattern Matcher
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { PatternMatcher } = require('../lib/map/pattern-matcher');

class TestPatternMatcher extends BaseMapGeneratorTest
{

    async testCountElementInstancesInMap()
    {
        let matcher = new PatternMatcher();
        await this.test('countElementInstancesInMap counts distinct instances by layer name', async () => {
            let config = {layerElements: {tree: [{type: 'tilelayer', name: 'tree-collisions'}]}};
            let map = {
                layers: [
                    {name: 'tree0-collisions', data: [1]},
                    {name: 'tree1-collisions', data: [2]},
                    {name: 'ground', data: [0]}
                ]
            };
            this.assertEqual(matcher.countElementInstancesInMap(map, config, 'tree'), 2, 'two tree instances counted');
        });
        await this.test('countElementInstancesInMap returns zero when element config is empty', async () => {
            let config = {layerElements: {tree: []}};
            let map = {layers: [{name: 'tree0-collisions', data: [1]}]};
            this.assertEqual(matcher.countElementInstancesInMap(map, config, 'tree'), 0, 'empty element config yields zero');
        });
        await this.test('countElementInstancesInMap returns zero when no tile layers exist', async () => {
            let config = {layerElements: {tree: [{type: 'objectgroup', name: 'tree-spawn'}]}};
            let map = {layers: [{name: 'tree0-collisions', data: [1]}]};
            this.assertEqual(matcher.countElementInstancesInMap(map, config, 'tree'), 0, 'no tile layers yields zero');
        });
    }

}

module.exports.TestPatternMatcher = TestPatternMatcher;
