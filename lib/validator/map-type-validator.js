/**
 *
 * Reldens - Tile Map Generator - MapTypeValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { Logger, sc } = require('@reldens/utils');

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

    analyzeMapArchitecture(map, config, mapType)
    {
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let totalTiles = width * height;
        let pathLayer = this.findLayerByName(map, 'path');
        let pathTileCount = pathLayer ? this.countNonZeroTiles(pathLayer.data) : 0;
        let pathPercentage = 0 === totalTiles ? 0 : (pathTileCount / totalTiles) * 100;
        let openSpaceAnalysis = this.analyzeOpenSpaceRatio(map, config);
        let connectivityAnalysis = this.analyzeNavigationPatterns(map, config);
        let expectedOpenSpaceRange = this.getExpectedOpenSpaceRange(mapType);
        let expectedPathRange = this.getExpectedPathRange(mapType);
        let isValidOpenSpace = openSpaceAnalysis.percentage >= expectedOpenSpaceRange.min && openSpaceAnalysis.percentage <= expectedOpenSpaceRange.max;
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

    getExpectedOpenSpaceRange(mapType)
    {
        let ranges = {
            'normal': {min: 60, max: 85},
            'dungeon': {min: 30, max: 60},
            'enclosed': {min: 50, max: 80},
            'basic': {min: 70, max: 95}
        };
        return sc.get(ranges, mapType, {min: 0, max: 100});
    }

    getExpectedPathRange(mapType)
    {
        let ranges = {
            'normal': {min: 5, max: 20},
            'dungeon': {min: 15, max: 35},
            'enclosed': {min: 8, max: 25},
            'basic': {min: 2, max: 15}
        };
        return sc.get(ranges, mapType, {min: 0, max: 100});
    }

    analyzeNavigationPatterns(map, config)
    {
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
        let pattern = this.classifyNavigationPattern(linearityScore, branchingScore, connectivityScore);
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

    classifyNavigationPattern(linearityScore, branchingScore, connectivityScore)
    {
        if(0.8 < linearityScore && 0.1 > branchingScore){
            return 'linear';
        }
        if(0.3 < branchingScore){
            return 'branching';
        }
        if(0.6 < connectivityScore){
            return 'network';
        }
        if(0.4 < linearityScore){
            return 'semi-linear';
        }
        return 'mixed';
    }

    validateNormalMapPatterns(map, config)
    {
        let validation = {
            isValid: true,
            openAreas: true,
            scatteredElements: true,
            connectingPaths: true,
            explorative: true,
            violations: []
        };
        let openSpaceAnalysis = this.analyzeOpenSpaceRatio(map, config);
        if(60 > openSpaceAnalysis.percentage){
            validation.openAreas = false;
            validation.violations.push('Insufficient open areas for normal map: '+openSpaceAnalysis.percentage+'%');
            validation.isValid = false;
        }
        let navigationPatterns = this.analyzeNavigationPatterns(map, config);
        if('linear' === navigationPatterns.pattern){
            validation.explorative = false;
            validation.violations.push('Navigation too linear for normal map');
            validation.isValid = false;
        }
        let elementDistribution = this.analyzeElementDistribution(map, config);
        if(!elementDistribution.wellDistributed){
            validation.scatteredElements = false;
            validation.violations.push('Elements not well distributed for normal map');
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
        let openSpaceAnalysis = this.analyzeOpenSpaceRatio(map, config);
        if(30 > openSpaceAnalysis.percentage){
            validation.enclosedSpaces = false;
            validation.violations.push('Open space ratio not appropriate for dungeon: '+openSpaceAnalysis.percentage+'%');
            validation.isValid = false;
        }
        if(60 < openSpaceAnalysis.percentage){
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

    analyzeElementDistribution(map, config)
    {
        let elementsQuantity = sc.get(config, 'elementsQuantity', {});
        let elementPositions = [];
        for(let elementType of Object.keys(elementsQuantity)){
            let positions = this.findElementPositionsInMap(map, elementType);
            elementPositions.push(...positions);
        }
        if(2 > elementPositions.length){
            return {wellDistributed: true, reason: 'Insufficient elements for distribution analysis'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let quadrants = this.divideIntoQuadrants(elementPositions, width, height);
        let occupiedQuadrants = quadrants.filter(q => 0 < q.length).length;
        let distributionScore = occupiedQuadrants / 4;
        return {
            wellDistributed: 0.5 <= distributionScore,
            distributionScore,
            occupiedQuadrants,
            quadrants
        };
    }

    divideIntoQuadrants(positions, width, height)
    {
        let midX = width / 2;
        let midY = height / 2;
        let quadrants = [[], [], [], []];
        for(let pos of positions){
            let quadrantIndex = 0;
            if(pos.x >= midX){
                quadrantIndex += 1;
            }
            if(pos.y >= midY){
                quadrantIndex += 2;
            }
            quadrants[quadrantIndex].push(pos);
        }
        return quadrants;
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
                let centerX = Math.floor(nonZeroPositions.reduce((sum, pos) => sum + pos.x, 0) / nonZeroPositions.length);
                let centerY = Math.floor(nonZeroPositions.reduce((sum, pos) => sum + pos.y, 0) / nonZeroPositions.length);
                positions.push({x: centerX, y: centerY, elementType});
            }
        }
        return positions;
    }

}

module.exports.MapTypeValidator = MapTypeValidator;
