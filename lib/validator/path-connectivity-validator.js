/**
 *
 * Reldens - Tile Map Generator - PathConnectivityValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { ElementPositionAnalyzer } = require('../map/element-position-analyzer');
const { PathFinder } = require('../path-finder/path-finder');
const { GraphAlgorithms } = require('../path-finder/graph-algorithms');
const { sc } = require('@reldens/utils');

class PathConnectivityValidator extends MapValidator
{

    constructor()
    {
        super();
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
        this.pathFinder = new PathFinder();
        this.graphAlgorithms = new GraphAlgorithms();
    }

    performValidation(map, config, options)
    {
        return this.runValidationPipeline([
            {label: 'Path Connectivity Validation', run: () => this.validatePathConnectivity(map, config)},
            {label: 'Element Reachability Validation', run: () => this.validateElementReachability(map, config)},
            {label: 'Path Continuity Validation', run: () => this.validatePathContinuity(map, config)},
            {label: 'Path Width Consistency Validation', run: () => this.validatePathWidthConsistency(map, config)}
        ]);
    }

    validatePathConnectivity(map, config)
    {
        let pathTile = sc.get(config, 'pathTile', 0);
        if(0 === pathTile){
            return {isValid: true, reason: 'No path tile configured'};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return {isValid: false, reason: 'Path layer not found'};
        }
        let graph = this.graphAlgorithms.buildConnectivityGraph(map, pathTile);
        if(!graph){
            return {isValid: false, reason: 'Could not build connectivity graph'};
        }
        let analysis = this.graphAlgorithms.analyzeConnectivity();
        return {
            isValid: analysis.isFullyConnected,
            totalPathNodes: analysis.totalNodes,
            componentCount: analysis.componentCount,
            largestComponentSize: analysis.largestComponentSize,
            isolatedNodes: analysis.isolatedNodesCount,
            fullyConnected: analysis.isFullyConnected,
            analysis
        };
    }

    validateElementReachability(map, config)
    {
        let pathTile = sc.get(config, 'pathTile', 0);
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        if(0 === pathTile){
            return {isValid: true, reason: 'No path configured'};
        }
        if(0 === Object.keys(elementsQuantity).length){
            return {isValid: true, reason: 'No elements configured'};
        }
        let mainPathPositions = this.findMainPathPositions(map, config);
        if(0 === mainPathPositions.length){
            return {isValid: false, reason: 'No main path found'};
        }
        let elementPositions = this.findAllElementPositions(map, config);
        let validation = {
            isValid: true,
            totalElements: elementPositions.length,
            reachableElements: 0,
            unreachableElements: 0,
            unreachableList: []
        };
        let grid = this.createPathfindingGrid(map, pathTile);
        let mainPathStart = mainPathPositions[0];
        for(let element of elementPositions){
            let nearestPathPosition = this.findNearestPathPosition(element, map, pathTile);
            if(!nearestPathPosition){
                validation.unreachableElements++;
                validation.unreachableList.push({
                    element,
                    reason: 'No nearby path found'
                });
                validation.isValid = false;
                continue;
            }
            let path = this.pathFinder.findPath(mainPathStart, nearestPathPosition, grid);
            if(0 === path.length){
                validation.unreachableElements++;
                validation.unreachableList.push({
                    element,
                    nearestPath: nearestPathPosition,
                    reason: 'No path route found'
                });
                validation.isValid = false;
                continue;
            }
            validation.reachableElements++;
        }
        validation.reachabilityPercentage = 0 === validation.totalElements
            ? 100
            : (validation.reachableElements / validation.totalElements) * 100;
        return validation;
    }

    findMainPathPositions(map, config)
    {
        let pathTile = sc.get(config, 'pathTile', 0);
        let mainPathSize = sc.get(config, 'mainPathSize', 0);
        if(0 === pathTile){
            return [];
        }
        if(0 === mainPathSize){
            return [];
        }
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return [];
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathPositions = this.elementPositionAnalyzer.findTilePositions(pathLayer.data, width, height, pathTile);
        let borderPathPositions = pathPositions.filter(pos =>
            0 === pos.x || 0 === pos.y || pos.x === width - 1 || pos.y === height - 1
        );
        if(0 < borderPathPositions.length){
            return borderPathPositions;
        }
        return pathPositions.slice(0, Math.min(mainPathSize, pathPositions.length));
    }

    findAllElementPositions(map, config)
    {
        return this.elementPositionAnalyzer.gatherElementPositions(map, config);
    }

    findNearestPathPosition(elementPosition, map, pathTile)
    {
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return null;
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathPositions = this.elementPositionAnalyzer.findTilePositions(pathLayer.data, width, height, pathTile);
        if(0 === pathPositions.length){
            return null;
        }
        return this.geometryCalculator.findNearestPosition(elementPosition, pathPositions);
    }

    createPathfindingGrid(map, pathTile)
    {
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let grid = this.pathFinder.create(width, height);
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return grid;
        }
        let pathPositions = this.elementPositionAnalyzer.findTilePositions(pathLayer.data, width, height, pathTile);
        for(let pos of pathPositions){
            grid.setWalkableAt(pos.x, pos.y, true);
        }
        return grid;
    }

    validatePathContinuity(map, config)
    {
        let pathTile = sc.get(config, 'pathTile', 0);
        if(0 === pathTile){
            return {isValid: true, reason: 'No path tile configured'};
        }
        let continuityResult = this.graphAlgorithms.validatePathContinuity(map, pathTile);
        if(!continuityResult.isValid){
            return continuityResult;
        }
        let gapAnalysis = this.analyzePathGaps(map, config);
        return {
            isValid: continuityResult.isValid && gapAnalysis.isValid,
            continuousPath: continuityResult.continuousPath,
            gapAnalysis,
            pathSegments: continuityResult.analysis.componentCount,
            isolatedSegments: continuityResult.analysis.isolatedNodesCount
        };
    }

    analyzePathGaps(map, config)
    {
        let pathTile = sc.get(config, 'pathTile', 0);
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return {isValid: false, reason: 'Path layer not found'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathPositions = this.elementPositionAnalyzer.findTilePositions(pathLayer.data, width, height, pathTile);
        let gaps = [];
        for(let pos of pathPositions){
            let neighbors = this.geometryCalculator.getNeighborPositions(pos.x, pos.y, width, height, false);
            let pathNeighbors = neighbors.filter(neighbor => {
                let neighborTile = pathLayer.data[neighbor.index];
                return neighborTile === pathTile;
            });
            if(0 === pathNeighbors.length){
                gaps.push({
                    position: pos,
                    reason: 'Isolated path tile',
                    neighborCount: neighbors.length
                });
            }
        }
        return {
            isValid: 0 === gaps.length,
            totalGaps: gaps.length,
            gaps
        };
    }

    validatePathWidthConsistency(map, config, tolerance)
    {
        if(undefined === tolerance){
            return {isValid: false, reason: 'tolerance parameter is required'};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return {isValid: true, reason: 'No path layer found'};
        }
        let pathSize = sc.get(config, 'pathSize', 1);
        let pathTile = sc.get(config, 'pathTile', 0);
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathPositions = this.elementPositionAnalyzer.findTilePositions(pathLayer.data, width, height, pathTile);
        let widthViolations = [];
        for(let pos of pathPositions){
            let localWidth = this.calculateLocalPathWidth(pos, pathLayer.data, width, height, pathTile);
            if(Math.abs(localWidth - pathSize) > tolerance){
                widthViolations.push({
                    position: pos,
                    expectedWidth: pathSize,
                    actualWidth: localWidth,
                    tolerance,
                    difference: Math.abs(localWidth - pathSize)
                });
            }
        }
        let totalPositions = pathPositions.length;
        let consistentPositions = totalPositions - widthViolations.length;
        let consistencyPercentage = 0 === totalPositions ? 100 : (consistentPositions / totalPositions) * 100;
        return {
            isValid: 0 === widthViolations.length,
            expectedWidth: pathSize,
            totalPositions,
            consistentPositions,
            violationCount: widthViolations.length,
            consistencyPercentage,
            tolerance,
            violations: widthViolations
        };
    }

    calculateLocalPathWidth(centerPos, layerData, width, height, pathTile)
    {
        let horizontalWidth = this.measureHorizontalPathWidth(centerPos, layerData, width, height, pathTile);
        let verticalWidth = this.measureVerticalPathWidth(centerPos, layerData, width, height, pathTile);
        return Math.min(horizontalWidth, verticalWidth);
    }

    measureHorizontalPathWidth(centerPos, layerData, width, height, pathTile)
    {
        return this.measureExtentAlongAxis(centerPos, layerData, width, height, pathTile, -1, 0, width);
    }

    measureVerticalPathWidth(centerPos, layerData, width, height, pathTile)
    {
        return this.measureExtentAlongAxis(centerPos, layerData, width, height, pathTile, 0, -1, height);
    }

    measureExtentAlongAxis(centerPos, layerData, width, height, pathTile, stepX, stepY, loopBound)
    {
        let negativeExtent = 0;
        let positiveExtent = 0;
        for(let distance = 1; distance < loopBound; distance++){
            let posX = centerPos.x + stepX * distance;
            let posY = centerPos.y + stepY * distance;
            let index = posY * width + posX;
            let inBounds = 0 <= posX && posX < width && 0 <= posY && posY < height;
            if(inBounds && layerData[index] === pathTile){
                negativeExtent = distance;
            }
            if(!inBounds || layerData[index] !== pathTile){
                break;
            }
        }
        for(let distance = 1; distance < loopBound; distance++){
            let posX = centerPos.x - stepX * distance;
            let posY = centerPos.y - stepY * distance;
            let index = posY * width + posX;
            let inBounds = 0 <= posX && posX < width && 0 <= posY && posY < height;
            if(inBounds && layerData[index] === pathTile){
                positiveExtent = distance;
            }
            if(!inBounds || layerData[index] !== pathTile){
                break;
            }
        }
        return 1 + negativeExtent + positiveExtent;
    }

}

module.exports.PathConnectivityValidator = PathConnectivityValidator;
