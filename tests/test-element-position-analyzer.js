/**
 *
 * Reldens - Test Element Position Analyzer
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { ElementPositionAnalyzer } = require('../lib/map/element-position-analyzer');

class TestElementPositionAnalyzer extends BaseMapGeneratorTest
{

    async testFindTilePositions()
    {
        let analyzer = new ElementPositionAnalyzer();
        await this.test('findTilePositions returns positions matching an exact value', async () => {
            let positions = analyzer.findTilePositions([0, 5, 0, 5], 2, 2, 5);
            this.assertEqual(positions.length, 2, 'two matching tiles');
            this.assertDeepEqual(positions[0], {x: 1, y: 0, index: 1}, 'first match carries coordinates');
        });
        await this.test('findTilePositions returns empty array for non-array data', async () => {
            let positions = analyzer.findTilePositions(null, 2, 2, 5);
            this.assertEqual(positions.length, 0, 'invalid data yields empty array');
        });
    }

    async testFindElementPositionsInMap()
    {
        let analyzer = new ElementPositionAnalyzer();
        await this.test('findElementPositionsInMap groups instance tiles into a bounding position', async () => {
            let map = {
                width: 3,
                height: 3,
                layers: [
                    {name: 'tree0-collisions', data: [0, 0, 0, 0, 7, 0, 0, 0, 0]},
                    {name: 'ground', data: [1, 1, 1, 1, 1, 1, 1, 1, 1]}
                ]
            };
            let positions = analyzer.findElementPositionsInMap(map, 'tree');
            this.assertEqual(positions.length, 1, 'one tree instance found');
            this.assertEqual(positions[0].x, 1, 'bounding x at the tile column');
            this.assertEqual(positions[0].y, 1, 'bounding y at the tile row');
            this.assertEqual(positions[0].layerName, 'tree-0', 'layer name combines type and instance');
        });
        await this.test('findElementPositionsInMap returns empty when no matching layers', async () => {
            let map = {width: 1, height: 1, layers: [{name: 'ground', data: [1]}]};
            let positions = analyzer.findElementPositionsInMap(map, 'tree');
            this.assertEqual(positions.length, 0, 'no matching element positions');
        });
    }

    async testGatherElementPositions()
    {
        let analyzer = new ElementPositionAnalyzer();
        await this.test('gatherElementPositions tags positions with their element type', async () => {
            let map = {
                width: 2,
                height: 2,
                layers: [
                    {name: 'tree0-collisions', data: [0, 5, 0, 0]}
                ]
            };
            let config = {elementsQuantity: {tree: 1}};
            let positions = analyzer.gatherElementPositions(map, config);
            this.assertEqual(positions.length, 1, 'one gathered position');
            this.assertEqual(positions[0].elementType, 'tree', 'element type tagged');
        });
        await this.test('gatherElementPositions returns empty for empty quantity config', async () => {
            let map = {width: 1, height: 1, layers: []};
            let positions = analyzer.gatherElementPositions(map, {elementsQuantity: {}});
            this.assertEqual(positions.length, 0, 'no positions for empty quantities');
        });
    }

    async testForEachElementPair()
    {
        let analyzer = new ElementPositionAnalyzer();
        await this.test('forEachElementPair visits every unique pair once', async () => {
            let pairs = [];
            analyzer.forEachElementPair(['a', 'b', 'c'], (first, second) => {
                pairs.push(first + second);
            });
            this.assertEqual(pairs.length, 3, 'three unique pairs for three items');
            this.assertDeepEqual(pairs, ['ab', 'ac', 'bc'], 'pairs are produced in order');
        });
        await this.test('forEachElementPair produces no pairs for a single item', async () => {
            let pairs = [];
            analyzer.forEachElementPair(['only'], (first, second) => {
                pairs.push(first + second);
            });
            this.assertEqual(pairs.length, 0, 'no pairs from a single item');
        });
    }

}

module.exports.TestElementPositionAnalyzer = TestElementPositionAnalyzer;
