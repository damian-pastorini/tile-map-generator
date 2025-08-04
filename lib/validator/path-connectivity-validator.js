/**
 *
 * Reldens - Tile Map Generator - PathConnectivityValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { PathFinder } = require('../path-finder/path-finder');
const { GraphAlgorithms } = require('../utilities/graph-algorithms');
const { sc } = require('@reldens/utils');

class PathConnectivityValidator extends MapValidator
{

    constructor()
    {
        super();
        this.pathFinder = new PathFinder();
        this.graphAlgorithms = new GraphAlgorithms();
    }

    performValidation(map, config, options)
    {
        let connectivityValidation = this.validatePathConnectivity(map, config);
        this.logValidationResult('Path Connectivity Validation', connectivityValidation);
        if(!connectivityValidation.isValid){
            return false;
        }
        let reachabilityValidation = this.validateElementReachability(map, config);
        this.logValidationResult('Element Reachability Validation', reachabilityValidation);
        if(!reachabilityValidation.isValid){
            return false;
        }
        let continuityValidation = this.validatePathContinuity(map, config);
        this.logValidationResult('Path Continuity Validation', continuityValidation);
        if(!continuityValidation.isValid){
            return false;
        }
        let widthValidation = this.validatePathWidthConsistency(map, config);
        this.logValidationResult('Path Width Consistency Validation', widthValidation);
        return widthValidation.isValid;
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
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
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
        validation.reachabilityPercentage = 0 === validation.totalElements ? 100 : (validation.reachableElements / validation.totalElements) * 100;
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
        let pathPositions = this.findTilePositions(pathLayer.data, width, height, pathTile);
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
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let elementPositions = [];
        for(let elementType of Object.keys(elementsQuantity)){
            let positions = this.findElementPositionsInMap(map, elementType);
            for(let pos of positions){
                elementPositions.push({...pos, elementType});
            }
        }
        return elementPositions;
    }

    findElementPositionsInMap(map, elementType)
    {
        let layers = sc.get(map, 'layers', []);
        let positions = [];
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(-1 === layerName.indexOf(elementType)){
                continue;
            }
            let layerData = sc.get(layer, 'data', []);
            let width = sc.get(map, 'width', 0);
            let height = sc.get(map, 'height', 0);
            let nonZeroPositions = this.findTilePositions(layerData, width, height, tile => 0 !== tile);
            if(0 < nonZeroPositions.length){
                let center = this.calculateCenterPosition(nonZeroPositions);
                positions.push({
                    x: center.x,
                    y: center.y,
                    layerName,
                    tileCount: nonZeroPositions.length
                });
            }
        }
        return positions;
    }

    calculateCenterPosition(positions)
    {
        let sumX = 0;
        let sumY = 0;
        for(let pos of positions){
            sumX += pos.x;
            sumY += pos.y;
        }
        return {
            x: Math.floor(sumX / positions.length),
            y: Math.floor(sumY / positions.length)
        };
    }

    findNearestPathPosition(elementPosition, map, pathTile)
    {
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return null;
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathPositions = this.findTilePositions(pathLayer.data, width, height, pathTile);
        if(0 === pathPositions.length){
            return null;
        }
        let nearestPath = pathPositions[0];
        let minDistance = this.calculateDistanceBetweenPositions(elementPosition, nearestPath);
        for(let i = 1; i < pathPositions.length; i++){
            let distance = this.calculateDistanceBetweenPositions(elementPosition, pathPositions[i]);
            if(distance < minDistance){
                minDistance = distance;
                nearestPath = pathPositions[i];
            }
        }
        return nearestPath;
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
        let pathPositions = this.findTilePositions(pathLayer.data, width, height, pathTile);
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
        let pathPositions = this.findTilePositions(pathLayer.data, width, height, pathTile);
        let gaps = [];
        for(let pos of pathPositions){
            let neighbors = this.getNeighborPositions(pos.x, pos.y, width, height, false);
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

    validatePathWidthConsistency(map, config)
    {
        let pathSize = sc.get(config, 'pathSize', 1);
        let pathTile = sc.get(config, 'pathTile', 0);
        if(1 === pathSize){
            return {isValid: true, reason: 'Single tile path configured'};
        }
        if(0 === pathTile){
            return {isValid: true, reason: 'No path configured'};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return {isValid: false, reason: 'Path layer not found'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathPositions = this.findTilePositions(pathLayer.data, width, height, pathTile);
        let widthViolations = [];
        for(let pos of pathPositions){
            let localWidth = this.calculateLocalPathWidth(pos, pathLayer.data, width, height, pathTile);
            let tolerance = 1;
            if(Math.abs(localWidth - pathSize) > tolerance){
                widthViolations.push({
                    position: pos,
                    expectedWidth: pathSize,
                    actualWidth: localWidth,
                    difference: Math.abs(localWidth - pathSize)
                });
            }
        }
        return {
            isValid: 0 === widthViolations.length,
            expectedWidth: pathSize,
            violations: widthViolations,
            violationCount: widthViolations.length,
            consistencyPercentage: 0 === pathPositions.length ? 100 : ((pathPositions.length - widthViolations.length) / pathPositions.length) * 100
        };
    }

    calculateLocalPathWidth(centerPos, layerData, width, height, pathTile)
    {
        let horizontalWidth = 1;
        let verticalWidth = 1;
        for(let dx = 1; dx < width; dx++){
            let leftX = centerPos.x - dx;
            let rightX = centerPos.x + dx;
            let leftValid = 0 <= leftX && layerData[centerPos.y * width + leftX] === pathTile;
            let rightValid = rightX < width && layerData[centerPos.y * width + rightX] === pathTile;
            if(leftValid){
                horizontalWidth++;
            }
            if(rightValid){
                horizontalWidth++;
            }
            if(!leftValid && !rightValid){
                break;
            }
        }
        for(let dy = 1; dy < height; dy++){
            let upY = centerPos.y - dy;
            let downY = centerPos.y + dy;
            let upValid = 0 <= upY && layerData[upY * width + centerPos.x] === pathTile;
            let downValid = downY < height && layerData[downY * width + centerPos.x] === pathTile;
            if(upValid){
                verticalWidth++;
            }
            if(downValid){
                verticalWidth++;
            }
            if(!upValid && !downValid){
                break;
            }
        }
        return Math.max(horizontalWidth, verticalWidth);
    }

}

module.exports.PathConnectivityValidator = PathConnectivityValidator;
