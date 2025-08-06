/**
 *
 * Reldens - Tile Map Generator - GraphAlgorithms
 *
 */

const { Logger, sc } = require('@reldens/utils');

class GraphAlgorithms
{

    constructor()
    {
        this.visitedNodes = new Set();
        this.adjacencyList = new Map();
    }

    buildConnectivityGraph(map, pathTileValue)
    {
        this.clearGraph();
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathLayer = this.findPathLayer(map);
        if(!pathLayer){
            Logger.critical('Path layer not found for connectivity analysis');
            return false;
        }
        let pathPositions = this.findPathTilePositions(pathLayer.data, width, height, pathTileValue);
        return this.createGraphFromPositions(pathPositions, width, height);
    }

    clearGraph()
    {
        this.visitedNodes.clear();
        this.adjacencyList.clear();
    }

    findPathLayer(map)
    {
        let layers = sc.get(map, 'layers', []);
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if('path' === layerName){
                return layer;
            }
        }
        return null;
    }

    findPathTilePositions(layerData, width, height, pathTileValue)
    {
        let positions = [];
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let index = y * width + x;
                if(layerData[index] === pathTileValue){
                    positions.push({x, y, index});
                }
            }
        }
        return positions;
    }

    createGraphFromPositions(positions, width, height)
    {
        let positionMap = new Map();
        for(let pos of positions){
            let key = pos.x+','+pos.y;
            positionMap.set(key, pos);
            this.adjacencyList.set(key, []);
        }
        for(let pos of positions){
            let neighbors = this.getAdjacentPositions(pos.x, pos.y, width, height);
            let currentKey = pos.x+','+pos.y;
            for(let neighbor of neighbors){
                let neighborKey = neighbor.x+','+neighbor.y;
                if(positionMap.has(neighborKey)){
                    this.adjacencyList.get(currentKey).push(neighborKey);
                }
            }
        }
        return this.adjacencyList;
    }

    getAdjacentPositions(x, y, width, height)
    {
        let neighbors = [];
        let directions = [
            {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0}
        ];
        for(let direction of directions){
            let newX = x + direction.dx;
            let newY = y + direction.dy;
            if(0 <= newX && newX < width && 0 <= newY && newY < height){
                neighbors.push({x: newX, y: newY});
            }
        }
        return neighbors;
    }

    findConnectedComponents()
    {
        let components = [];
        let allNodes = [...this.adjacencyList.keys()];
        let globalVisited = new Set();
        for(let node of allNodes){
            if(!globalVisited.has(node)){
                let component = this.depthFirstSearchComponent(node, globalVisited);
                if(0 < component.length){
                    components.push(component);
                }
            }
        }
        return components;
    }

    depthFirstSearchComponent(startNode, globalVisited)
    {
        let component = [];
        let stack = [startNode];
        while(0 < stack.length){
            let currentNode = stack.pop();
            if(!globalVisited.has(currentNode)){
                globalVisited.add(currentNode);
                component.push(currentNode);
                let neighbors = this.adjacencyList.get(currentNode) || [];
                for(let neighbor of neighbors){
                    if(!globalVisited.has(neighbor)){
                        stack.push(neighbor);
                    }
                }
            }
        }
        return component;
    }

    findIsolatedNodes()
    {
        let isolatedNodes = [];
        for(let [node, neighbors] of this.adjacencyList){
            if(0 === neighbors.length){
                isolatedNodes.push(node);
            }
        }
        return isolatedNodes;
    }

    analyzeConnectivity()
    {
        let components = this.findConnectedComponents();
        let isolatedNodes = this.findIsolatedNodes();
        let totalNodes = this.adjacencyList.size;
        let largestComponentSize = 0 < components.length ? Math.max(...components.map(c => c.length)) : 0;
        return {
            totalNodes,
            componentCount: components.length,
            largestComponentSize,
            isolatedNodesCount: isolatedNodes.length,
            components,
            isolatedNodes,
            isFullyConnected: 1 === components.length && 0 === isolatedNodes.length
        };
    }

    validatePathContinuity(map, pathTileValue)
    {
        let graph = this.buildConnectivityGraph(map, pathTileValue);
        if(!graph){
            return {isValid: false, error: 'Could not build connectivity graph'};
        }
        let analysis = this.analyzeConnectivity();
        let hasGaps = 1 < analysis.componentCount || 0 < analysis.isolatedNodesCount;
        return {
            isValid: !hasGaps,
            continuousPath: analysis.isFullyConnected,
            gaps: hasGaps,
            gapCount: analysis.componentCount - 1,
            analysis
        };
    }

}

module.exports.GraphAlgorithms = GraphAlgorithms;
