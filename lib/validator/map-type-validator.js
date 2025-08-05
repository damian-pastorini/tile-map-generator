/**
 *
 * Reldens - Tile Map Generator - MapTypeValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { sc } = require('@reldens/utils');

class MapTypeValidator extends MapValidator
{

    performValidation(map, config, options)
    {
        let mapType = this.determineMapType(config);
        let architecturalValidation = this.analyzeMapArchitecture(map, config, mapType);
        this.logValidationResult('Map Architecture Analysis', architecturalValidation);
        if(!architecturalValidation.isValid){
            return false;
        }
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

    analyzeMapArchitecture(map, config, mapType, customOpenSpaceRange, customPathRange)
    {
        if(undefined === customOpenSpaceRange || undefined === customPathRange){
            return {isValid: false, reason: 'customOpenSpaceRange and customPathRange parameters are required'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let totalTiles = width * height;
        let pathLayer = this.findLayerByName(map, 'path');
        let pathTileCount = pathLayer ? this.countNonZeroTiles(pathLayer.data) : 0;
        let pathPercentage = 0 === totalTiles ? 0 : (pathTileCount / totalTiles) * 100;
        let openSpaceAnalysis = this.analyzeOpenSpaceRatio(map, config);
        let connectivityAnalysis = this.analyzeNavigationPatterns(map, config);
        let expectedOpenSpaceRange = sc.get(customOpenSpaceRange, mapType, {min: 0, max: 100});
        let expectedPathRange = sc.get(customPathRange, mapType, {min: 0, max: 100});
        let isValidOpenSpace = openSpaceAnalysis.percentage >= expectedOpenSpaceRange.min
            && openSpaceAnalysis.percentage <= expectedOpenSpaceRange.max;
        let isValidPathRatio = pathPercentage >= expectedPathRange.min && pathPercentage <= expectedPathRange.max;
        return {
            isValid: isValidOpenSpace && isValidPathRatio,
            mapType,
            totalTiles,
            pathTileCount,
            pathPercentage,
            openSpaceAnalysis,
            connectivityAnalysis,
            expectedRanges: {
                openSpace: expectedOpenSpaceRange,
                pathRatio: expectedPathRange
            },
            validations: {
                openSpace: isValidOpenSpace,
                pathRatio: isValidPathRatio
            }
        };
    }

    analyzeOpenSpaceRatio(map, config)
    {
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let totalTiles = width * height;
        let groundTile = sc.get(config, 'groundTile', 0);
        let layers = sc.get(map, 'layers', []);
        let occupiedTiles = 0;
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if('ground' === layerName || 'ground-variations' === layerName){
                continue;
            }
            occupiedTiles += this.countNonZeroTiles(layer.data);
        }
        let openSpaceTiles = totalTiles - occupiedTiles;
        let openSpacePercentage = 0 === totalTiles ? 0 : (openSpaceTiles / totalTiles) * 100;
        return {
            totalTiles,
            occupiedTiles,
            openSpaceTiles,
            percentage: openSpacePercentage
        };
    }

    getExpectedOpenSpaceRange(mapType, customRanges)
    {
        if(undefined === customRanges){
            return {isValid: false, reason: 'customRanges parameter is required'};
        }
        return sc.get(customRanges, mapType, {min: 0, max: 100});
    }

    getExpectedPathRange(mapType, customRanges)
    {
        if(undefined === customRanges){
            return {isValid: false, reason: 'customRanges parameter is required'};
        }
        return sc.get(customRanges, mapType, {min: 0, max: 100});
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
        let pathPositions = this.findTilePositions(pathLayer.data, width, height, pathTile);
        if(0 === pathPositions.length){
            return {pattern: 'none', complexity: 0};
        }
        let linearityScore = this.calculateLinearityScore(pathPositions);
        let branchingScore = this.calculateBranchingScore(pathPositions, width, height);
        let connectivityScore = this.calculateConnectivityComplexity(pathPositions, width, height);
        let pattern = this.classifyNavigationPattern(linearityScore, branchingScore, connectivityScore, customThresholds);
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
            let neighbors = this.getNeighborPositions(pos.x, pos.y, width, height, false);
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
            let neighbors = this.getNeighborPositions(pos.x, pos.y, width, height, false);
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

    validateNormalMapPatterns(map, config, expectedOpenSpace, expectedPattern, customThresholds)
    {
        if(undefined === expectedOpenSpace || undefined === expectedPattern || undefined === customThresholds){
            return {isValid: false, reason: 'expectedOpenSpace, expectedPattern, and customThresholds parameters are required'};
        }
        let validation = {
            isValid: true,
            openAreas: true,
            connectingPaths: true,
            explorative: true,
            violations: []
        };
        let openSpaceAnalysis = this.analyzeOpenSpaceRatio(map, config);
        let actualOpenSpace = Math.round(openSpaceAnalysis.percentage * 10000) / 10000;
        if(expectedOpenSpace !== actualOpenSpace){
            validation.openAreas = false;
            validation.violations.push('Open space mismatch: expected '+expectedOpenSpace+'%, actual '+actualOpenSpace+'%');
            validation.isValid = false;
        }
        let navigationPatterns = this.analyzeNavigationPatterns(map, config, customThresholds);
        if(expectedPattern !== navigationPatterns.pattern){
            validation.explorative = false;
            validation.violations.push('Navigation pattern mismatch: expected '+expectedPattern+', actual '+navigationPatterns.pattern);
            validation.isValid = false;
        }
        return validation;
    }

    validateDungeonMapPatterns(map, config, minOpenSpace, maxOpenSpace)
    {
        if(undefined === minOpenSpace || undefined === maxOpenSpace){
            return {isValid: false, reason: 'minOpenSpace and maxOpenSpace parameters are required'};
        }
        let validation = {
            isValid: true,
            roomCorridorStructure: true,
            enclosedSpaces: true,
            doorConnections: true,
            violations: []
        };
        let openSpaceAnalysis = this.analyzeOpenSpaceRatio(map, config);
        if(minOpenSpace > openSpaceAnalysis.percentage){
            validation.enclosedSpaces = false;
            validation.violations.push('Open space ratio not appropriate for dungeon: '+openSpaceAnalysis.percentage+'%');
            validation.isValid = false;
        }
        if(maxOpenSpace < openSpaceAnalysis.percentage){
            validation.enclosedSpaces = false;
            validation.violations.push('Open space ratio not appropriate for dungeon: '+openSpaceAnalysis.percentage+'%');
            validation.isValid = false;
        }
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
