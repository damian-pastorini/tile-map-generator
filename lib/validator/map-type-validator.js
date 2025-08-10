/**
 *
 * Reldens - Tile Map Generator - MapTypeValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { ElementPositionAnalyzer } = require('../utilities/element-position-analyzer');
const { sc } = require('@reldens/utils');

class MapTypeValidator extends MapValidator
{

    constructor()
    {
        super();
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
    }

    performValidation(map, config, options)
    {
        let mapType = this.determineMapType(config);
        if('normal' === mapType){
            let normalValidation = this.validateNormalMapPatterns(map, config);
            this.logValidationResult('Normal Map Patterns Validation', normalValidation);
            return normalValidation.isValid;
        }
        if('dungeon' === mapType){
            let dungeonValidation = this.validateDungeonMapPatterns(map, config);
            this.logValidationResult('Dungeon Map Patterns Validation', dungeonValidation);
            return dungeonValidation.isValid;
        }
        return true;
    }

    determineMapType(config)
    {
        let blockMapBorder = sc.get(config, 'blockMapBorder', false);
        let mainPathSize = sc.get(config, 'mainPathSize', 0);
        let entryPosition = sc.get(config, 'entryPosition', '');
        if(blockMapBorder && '' !== entryPosition){
            return 'dungeon';
        }
        if(blockMapBorder){
            return 'enclosed';
        }
        if(0 < mainPathSize){
            return 'normal';
        }
        return 'basic';
    }

    analyzeNavigationPatterns(map, config, customThresholds)
    {
        if(undefined === customThresholds){
            return {pattern: 'none', complexity: 0};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            return {pattern: 'none', complexity: 0};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathTile = sc.get(config, 'pathTile', 0);
        let pathPositions = this.elementPositionAnalyzer.findTilePositions(pathLayer.data, width, height, pathTile);
        if(0 === pathPositions.length){
            return {pattern: 'none', complexity: 0};
        }
        let linearityScore = this.calculateLinearityScore(pathPositions);
        let branchingScore = this.calculateBranchingScore(pathPositions, width, height);
        let connectivityScore = this.calculateConnectivityComplexity(pathPositions, width, height);
        let pattern = this.classifyNavigationPattern(
            linearityScore,
            branchingScore,
            connectivityScore,
            customThresholds
        );
        return {
            pattern,
            linearityScore,
            branchingScore,
            connectivityScore,
            complexity: (branchingScore + connectivityScore) / 2
        };
    }

    calculateLinearityScore(pathPositions)
    {
        if(3 > pathPositions.length){
            return 1;
        }
        let directions = [];
        for(let i = 1; i < pathPositions.length; i++){
            let dx = pathPositions[i].x - pathPositions[i-1].x;
            let dy = pathPositions[i].y - pathPositions[i-1].y;
            if(0 !== dx){
                directions.push(0 < dx ? 'right' : 'left');
            }
            if(0 !== dy){
                directions.push(0 < dy ? 'down' : 'up');
            }
        }
        let uniqueDirections = [...new Set(directions)];
        let maxDirections = 4;
        return 1 - (uniqueDirections.length / maxDirections);
    }

    calculateBranchingScore(pathPositions, width, height)
    {
        let branchingPoints = 0;
        for(let pos of pathPositions){
            let neighbors = this.geometryCalculator.getNeighborPositions(pos.x, pos.y, width, height, false);
            let pathNeighbors = neighbors.filter(neighbor => {
                return pathPositions.some(pathPos => pathPos.x === neighbor.x && pathPos.y === neighbor.y);
            });
            if(2 < pathNeighbors.length){
                branchingPoints++;
            }
        }
        return 0 === pathPositions.length ? 0 : branchingPoints / pathPositions.length;
    }

    calculateConnectivityComplexity(pathPositions, width, height)
    {
        if(1 >= pathPositions.length){
            return 0;
        }
        let totalConnections = 0;
        for(let pos of pathPositions){
            let neighbors = this.geometryCalculator.getNeighborPositions(pos.x, pos.y, width, height, false);
            let pathNeighbors = neighbors.filter(neighbor => {
                return pathPositions.some(pathPos => pathPos.x === neighbor.x && pathPos.y === neighbor.y);
            });
            totalConnections += pathNeighbors.length;
        }
        let averageConnections = totalConnections / pathPositions.length;
        return Math.min(averageConnections / 4, 1);
    }

    classifyNavigationPattern(linearityScore, branchingScore, connectivityScore, customThresholds)
    {
        if(customThresholds.linearHigh < linearityScore && customThresholds.linearLow > branchingScore){
            return 'linear';
        }
        if(customThresholds.branchingHigh < branchingScore){
            return 'branching';
        }
        if(customThresholds.connectivityHigh < connectivityScore){
            return 'network';
        }
        if(customThresholds.semiLinear < linearityScore){
            return 'semi-linear';
        }
        return 'mixed';
    }

    validateNormalMapPatterns(map, config, expectedPattern, customThresholds)
    {
        let validation = {
            isValid: true,
            connectingPaths: true,
            explorative: true,
            violations: []
        };
        if(expectedPattern && customThresholds){
            let navigationPatterns = this.analyzeNavigationPatterns(map, config, customThresholds);
            if(expectedPattern !== navigationPatterns.pattern){
                validation.explorative = false;
                validation.violations.push(
                    'Navigation pattern mismatch: expected '+expectedPattern+', actual '+navigationPatterns.pattern
                );
                validation.isValid = false;
            }
        }
        let pathLayer = this.findLayerByName(map, 'path');
        let generateElementsPath = sc.get(config, 'generateElementsPath', true);
        if(generateElementsPath && !pathLayer){
            validation.connectingPaths = false;
            validation.violations.push('Path layer missing when generateElementsPath is enabled');
            validation.isValid = false;
        }
        return validation;
    }

    validateDungeonMapPatterns(map, config)
    {
        let validation = {
            isValid: true,
            roomCorridorStructure: true,
            enclosedSpaces: true,
            doorConnections: true,
            violations: []
        };
        let borderLayer = this.findLayerByName(map, 'collisions-map-border');
        if(!borderLayer){
            validation.enclosedSpaces = false;
            validation.violations.push('Dungeon map missing border enclosure');
            validation.isValid = false;
        }
        let entryPosition = sc.get(config, 'entryPosition', '');
        if('' === entryPosition){
            validation.doorConnections = false;
            validation.violations.push('Dungeon map missing entry position');
            validation.isValid = false;
        }
        return validation;
    }

}

module.exports.MapTypeValidator = MapTypeValidator;
