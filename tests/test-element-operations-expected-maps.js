/**
 *
 * Reldens - Test Element Operations Expected Maps
 *
 * Real-map proving tests for the post-generation element operations. Every case loads the committed real
 * five-trees-unmerged.json map, applies one operation (move or delete on a single element instance) and
 * compares the full result against a committed deterministic expected map file under tests/test-data
 * (materialized on first run, then committed). The operations are pure transformations, so no seeding is
 * involved and every expected map can be verified visually by opening it in Tiled.
 *
 */

const { BaseExpectedMapTest } = require('./base-expected-map-test');
const { ElementsFromLayersLoader } = require('../lib/loader/elements-from-layers-loader');
const { ElementMover } = require('../lib/map/element-mover');
const { ElementDeleter } = require('../lib/map/element-deleter');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestElementOperationsExpectedMaps extends BaseExpectedMapTest
{

    async testMoveTreeMatchesCommittedExpectedMap()
    {
        await this.test('moving tree-2 two tiles left on the real five-trees map matches its expected map', async () => {
            let working = FileHandler.fetchFileJson(
                FileHandler.joinPaths(this.testDataFolder, 'five-trees-unmerged.json')
            );
            let record = new ElementsFromLayersLoader().load(working);
            let element = sc.fetchByProperty(record.elements, 'instanceId', 'tree-2');
            this.assert(element, 'The real five-trees map must contain the tree-2 instance');
            this.assertDeepEqual(
                element.bounds,
                {col: 8, row: 0, width: 6, height: 8},
                'The tree-2 instance must start at column eight on the first row'
            );
            let result = new ElementMover().move(working, record, 'tree-2', -2, 0);
            this.assert(result.success, 'The move must succeed on the real five-trees map');
            this.assertDeepEqual(
                element.bounds,
                {col: 6, row: 0, width: 6, height: 8},
                'The move must shift the tree-2 bounds exactly two columns to the left'
            );
            let expected = this.loadOrCreateExpectedMap('five-trees-moved-tree-2-expected.json', working);
            this.compareMapOutputs(expected, working);
        });
    }

    async testDeleteTreeMatchesCommittedExpectedMap()
    {
        await this.test('deleting tree-4 on the real five-trees map matches its expected map', async () => {
            let working = FileHandler.fetchFileJson(
                FileHandler.joinPaths(this.testDataFolder, 'five-trees-unmerged.json')
            );
            let record = new ElementsFromLayersLoader().load(working);
            let result = new ElementDeleter().delete(working, record, 'tree-4');
            this.assert(result.success, 'The delete must succeed on the real five-trees map');
            this.assertEqual(record.elements.length, 4, 'The record must keep the four remaining trees');
            let expected = this.loadOrCreateExpectedMap('five-trees-deleted-tree-4-expected.json', working);
            this.compareMapOutputs(expected, working);
        });
    }

}

module.exports.TestElementOperationsExpectedMaps = TestElementOperationsExpectedMaps;
