/**
 *
 * Reldens - Test Graph Algorithms
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { GraphAlgorithms } = require('../lib/path-finder/graph-algorithms');

class TestGraphAlgorithms extends BaseMapGeneratorTest
{

    async testFindPathLayer()
    {
        let graph = new GraphAlgorithms();
        await this.test('findPathLayer returns the path layer when present', async () => {
            let map = {layers: [{name: 'ground', data: [0]}, {name: 'path', data: [5]}]};
            let layer = graph.findPathLayer(map);
            this.assert(layer, 'path layer returned');
            this.assertEqual(layer.name, 'path', 'returned layer is path');
        });
        await this.test('findPathLayer returns null when no path layer exists', async () => {
            let map = {layers: [{name: 'ground', data: [0]}]};
            this.assertEqual(graph.findPathLayer(map), null, 'missing path layer returns null');
        });
    }

    async testGetAdjacentPositions()
    {
        let graph = new GraphAlgorithms();
        await this.test('getAdjacentPositions returns four neighbors for a central tile', async () => {
            let neighbors = graph.getAdjacentPositions(1, 1, 3, 3);
            this.assertEqual(neighbors.length, 4, 'central tile has four orthogonal neighbors');
        });
        await this.test('getAdjacentPositions clamps neighbors at the origin corner', async () => {
            let neighbors = graph.getAdjacentPositions(0, 0, 3, 3);
            this.assertEqual(neighbors.length, 2, 'corner tile has two neighbors');
        });
    }

    async testBuildConnectivityGraphConnected()
    {
        let graph = new GraphAlgorithms();
        await this.test('buildConnectivityGraph links adjacent path tiles', async () => {
            let map = {
                width: 3,
                height: 1,
                layers: [{name: 'path', data: [5, 5, 5]}]
            };
            let adjacency = graph.buildConnectivityGraph(map, 5);
            this.assertEqual(adjacency.size, 3, 'three path nodes');
            this.assertEqual(adjacency.get('1,0').length, 2, 'middle node links both sides');
        });
        await this.test('buildConnectivityGraph returns false when path layer is missing', async () => {
            let map = {width: 1, height: 1, layers: [{name: 'ground', data: [0]}]};
            this.assertEqual(graph.buildConnectivityGraph(map, 5), false, 'missing path layer returns false');
        });
    }

    async testAnalyzeConnectivityFullyConnected()
    {
        let graph = new GraphAlgorithms();
        await this.test('analyzeConnectivity reports a single component for a connected path', async () => {
            let map = {width: 3, height: 1, layers: [{name: 'path', data: [5, 5, 5]}]};
            graph.buildConnectivityGraph(map, 5);
            let analysis = graph.analyzeConnectivity();
            this.assertEqual(analysis.totalNodes, 3, 'three nodes total');
            this.assertEqual(analysis.componentCount, 1, 'one connected component');
            this.assertEqual(analysis.largestComponentSize, 3, 'largest component covers all nodes');
            this.assertEqual(analysis.isFullyConnected, true, 'graph is fully connected');
        });
    }

    async testAnalyzeConnectivityDisconnected()
    {
        let graph = new GraphAlgorithms();
        await this.test('analyzeConnectivity reports multiple components for a split path', async () => {
            let map = {width: 5, height: 1, layers: [{name: 'path', data: [5, 0, 0, 5, 5]}]};
            graph.buildConnectivityGraph(map, 5);
            let analysis = graph.analyzeConnectivity();
            this.assertEqual(analysis.componentCount, 2, 'two disconnected components');
            this.assertEqual(analysis.isFullyConnected, false, 'graph is not fully connected');
            this.assertEqual(analysis.isolatedNodesCount, 1, 'one isolated node');
        });
    }

    async testFindIsolatedNodes()
    {
        let graph = new GraphAlgorithms();
        await this.test('findIsolatedNodes returns nodes with no neighbors', async () => {
            let map = {width: 5, height: 1, layers: [{name: 'path', data: [5, 0, 0, 0, 5]}]};
            graph.buildConnectivityGraph(map, 5);
            let isolated = graph.findIsolatedNodes();
            this.assertEqual(isolated.length, 2, 'both lone tiles are isolated');
        });
        await this.test('findIsolatedNodes returns empty when every node has a neighbor', async () => {
            let map = {width: 2, height: 1, layers: [{name: 'path', data: [5, 5]}]};
            graph.buildConnectivityGraph(map, 5);
            let isolated = graph.findIsolatedNodes();
            this.assertEqual(isolated.length, 0, 'no isolated nodes in a connected pair');
        });
    }

    async testValidatePathContinuity()
    {
        let graph = new GraphAlgorithms();
        await this.test('validatePathContinuity reports valid for a continuous path', async () => {
            let map = {width: 3, height: 1, layers: [{name: 'path', data: [5, 5, 5]}]};
            let result = graph.validatePathContinuity(map, 5);
            this.assertEqual(result.isValid, true, 'continuous path is valid');
            this.assertEqual(result.gaps, false, 'no gaps present');
            this.assertEqual(result.gapCount, 0, 'gap count is zero');
        });
        await this.test('validatePathContinuity reports gaps for a split path', async () => {
            let map = {width: 5, height: 1, layers: [{name: 'path', data: [5, 0, 0, 5, 5]}]};
            let result = graph.validatePathContinuity(map, 5);
            this.assertEqual(result.isValid, false, 'split path is invalid');
            this.assertEqual(result.gaps, true, 'gaps detected');
            this.assertEqual(result.gapCount, 1, 'one gap between two components');
        });
        await this.test('validatePathContinuity reports error when graph cannot be built', async () => {
            let groundOnlyMap = {width: 1, height: 1, layers: [{name: 'ground', data: [0]}]};
            let result = graph.validatePathContinuity(groundOnlyMap, 5);
            this.assertEqual(result.isValid, false, 'missing path layer is invalid');
            this.assertEqual(result.error, 'Could not build connectivity graph', 'error message reported');
        });
    }

    async testClearGraph()
    {
        let graph = new GraphAlgorithms();
        await this.test('clearGraph empties the adjacency list and visited set', async () => {
            let map = {width: 2, height: 1, layers: [{name: 'path', data: [5, 5]}]};
            graph.buildConnectivityGraph(map, 5);
            this.assertEqual(graph.adjacencyList.size, 2, 'graph populated before clear');
            graph.clearGraph();
            this.assertEqual(graph.adjacencyList.size, 0, 'adjacency list cleared');
            this.assertEqual(graph.visitedNodes.size, 0, 'visited nodes cleared');
        });
    }

}

module.exports.TestGraphAlgorithms = TestGraphAlgorithms;
