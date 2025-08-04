/**
 *
 * Reldens - Tile Map Generator - GroundVariationsValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { sc } = require('@reldens/utils');

class GroundVariationsValidator extends MapValidator
{

    performValidation(map, config, options)
    {
        let percentageValidation = this.validateVariationPercentage(map, config);
        this.logValidationResult('Variation Percentage Validation', percentageValidation);
        if(!percentageValidation.isValid){
            return false;
        }
        let distributionValidation = this.validateVariationDistribution(map, config);
        this.logValidationResult('Variation Distribution Validation', distributionValidation);
        if(!distributionValidation.isValid){
            return false;
        }
        let tileTypesValidation = this.validateVariationTileTypes(map, config);
        this.logValidationResult('Variation Tile Types Validation', tileTypesValidation);
        if(!tileTypesValidation.isValid){
            return false;
        }
        let placementValidation = this.validateVariationPlacement(map, config);
        this.logValidationResult('Variation Placement Validation', placementValidation);
        return placementValidation.isValid;
    }

    validateVariationQuantity(map, config)
    {
        let randomGroundTiles = sc.get(config, 'randomGroundTiles', []);
        let variableTilesPercentage = sc.get(config, 'variableTilesPercentage', 0);
        if(0 === randomGroundTiles.length || 0 === variableTilesPercentage){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: false, reason: 'Ground variations layer not found'};
        }
        let variationCount = this.countVariationTiles(groundVariationsLayer.data, randomGroundTiles);
        return {
            isValid: 0 < variationCount,
            variationCount,
            configured: 0 < variableTilesPercentage,
            reason: 0 === variationCount ? 'No variation tiles found' : 'Variations found'
        };
    }

    validateVariationPercentage(map, config)
    {
        let randomGroundTiles = sc.get(config, 'randomGroundTiles', []);
        let variableTilesPercentage = sc.get(config, 'variableTilesPercentage', 0);
        let groundTile = sc.get(config, 'groundTile', 0);
        if(0 === randomGroundTiles.length){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        if(0 === variableTilesPercentage){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: false, reason: 'Ground variations layer not found'};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        let pathLayerData = pathLayer ? pathLayer.data : [];
        let totalGroundTiles = this.countAvailableGroundTiles(pathLayerData, groundTile);
        let variationTiles = this.countVariationTiles(groundVariationsLayer.data, randomGroundTiles);
        let actualPercentage = 0 === totalGroundTiles ? 0 : (variationTiles / totalGroundTiles) * 100;
        let percentageDifference = Math.abs(actualPercentage - variableTilesPercentage);
        let tolerance = 2;
        let isWithinTolerance = percentageDifference <= tolerance;
        return {
            isValid: isWithinTolerance,
            totalGroundTiles,
            variationTiles,
            expectedPercentage: variableTilesPercentage,
            actualPercentage,
            percentageDifference,
            tolerance,
            withinTolerance: isWithinTolerance
        };
    }

    countAvailableGroundTiles(pathLayerData, groundTile)
    {
        if(!sc.isArray(pathLayerData)){
            return 0;
        }
        let groundTileCount = 0;
        for(let tile of pathLayerData){
            if(0 === tile){
                groundTileCount++;
            }
        }
        return groundTileCount;
    }

    countVariationTiles(variationsLayerData, randomGroundTiles)
    {
        if(!sc.isArray(variationsLayerData) || !sc.isArray(randomGroundTiles)){
            return 0;
        }
        let variationCount = 0;
        for(let tile of variationsLayerData){
            if(-1 !== randomGroundTiles.indexOf(tile)){
                variationCount++;
            }
        }
        return variationCount;
    }

    validateVariationDistribution(map, config)
    {
        let randomGroundTiles = sc.get(config, 'randomGroundTiles', []);
        if(0 === randomGroundTiles.length){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: false, reason: 'Ground variations layer not found'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let variationPositions = [];
        for(let tileValue of randomGroundTiles){
            let positions = this.findTilePositions(groundVariationsLayer.data, width, height, tileValue);
            variationPositions.push(...positions);
        }
        if(0 === variationPositions.length){
            return {isValid: true, reason: 'No variation tiles placed'};
        }
        let distributionAnalysis = this.analyzeDistributionRandomness(variationPositions, width, height);
        return {
            isValid: distributionAnalysis.isAcceptablyRandom,
            totalVariations: variationPositions.length,
            clusteringScore: distributionAnalysis.clusteringScore,
            distributionScore: distributionAnalysis.distributionScore,
            isAcceptablyRandom: distributionAnalysis.isAcceptablyRandom,
            analysis: distributionAnalysis
        };
    }

    analyzeDistributionRandomness(positions, width, height)
    {
        if(2 > positions.length){
            return {isAcceptablyRandom: true, clusteringScore: 0, distributionScore: 100};
        }
        let clusteringScore = this.calculateClusteringScore(positions);
        let distributionScore = this.calculateDistributionScore(positions, width, height);
        let clusteringThreshold = 0.3;
        let distributionThreshold = 60;
        let isAcceptablyRandom = clusteringScore < clusteringThreshold && distributionScore >= distributionThreshold;
        return {
            isAcceptablyRandom,
            clusteringScore,
            distributionScore,
            clusteringThreshold,
            distributionThreshold
        };
    }

    calculateClusteringScore(positions)
    {
        let totalDistance = 0;
        let pairCount = 0;
        for(let i = 0; i < positions.length; i++){
            for(let j = i + 1; j < positions.length; j++){
                let distance = this.calculateDistanceBetweenPositions(positions[i], positions[j]);
                totalDistance += distance;
                pairCount++;
            }
        }
        let averageDistance = 0 === pairCount ? 0 : totalDistance / pairCount;
        let minPossibleDistance = 1;
        let maxReasonableDistance = Math.sqrt(positions.length) * 3;
        let normalizedScore = 0 === maxReasonableDistance ? 0 : (maxReasonableDistance - averageDistance) / maxReasonableDistance;
        return Math.max(0, Math.min(1, normalizedScore));
    }

    calculateDistributionScore(positions, width, height)
    {
        let gridSize = 5;
        let cellsX = Math.ceil(width / gridSize);
        let cellsY = Math.ceil(height / gridSize);
        let cellCounts = Array(cellsX * cellsY).fill(0);
        for(let pos of positions){
            let cellX = Math.floor(pos.x / gridSize);
            let cellY = Math.floor(pos.y / gridSize);
            if(cellX < cellsX && cellY < cellsY){
                cellCounts[cellY * cellsX + cellX]++;
            }
        }
        let occupiedCells = cellCounts.filter(count => 0 < count).length;
        let totalCells = cellsX * cellsY;
        return (occupiedCells / totalCells) * 100;
    }

    validateVariationTileTypes(map, config)
    {
        let randomGroundTiles = sc.get(config, 'randomGroundTiles', []);
        if(0 === randomGroundTiles.length){
            return {isValid: true, reason: 'No ground variations configured'};
        }
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: false, reason: 'Ground variations layer not found'};
        }
        let validation = {
            isValid: true,
            correctTileTypes: 0,
            incorrectTileTypes: 0,
            violations: []
        };
        let layerData = groundVariationsLayer.data;
        for(let i = 0; i < layerData.length; i++){
            let tile = layerData[i];
            if(0 === tile){
                continue;
            }
            if(-1 !== randomGroundTiles.indexOf(tile)){
                validation.correctTileTypes++;
                continue;
            }
            validation.incorrectTileTypes++;
            validation.violations.push({
                tileIndex: i,
                actualTile: tile,
                expectedTiles: randomGroundTiles,
                issue: 'unexpected-variation-tile'
            });
            validation.isValid = false;
        }
        return validation;
    }

    validateVariationPlacement(map, config)
    {
        let groundVariationsLayer = this.findLayerByName(map, 'ground-variations');
        if(!groundVariationsLayer){
            return {isValid: true, reason: 'Ground variations layer not found'};
        }
        let pathLayer = this.findLayerByName(map, 'path');
        let validation = {
            isValid: true,
            correctPlacements: 0,
            incorrectPlacements: 0,
            violations: []
        };
        let layerData = groundVariationsLayer.data;
        for(let i = 0; i < layerData.length; i++){
            let variationTile = layerData[i];
            if(0 === variationTile){
                continue;
            }
            let pathTile = pathLayer ? pathLayer.data[i] : 0;
            if(0 !== pathTile){
                validation.incorrectPlacements++;
                validation.violations.push({
                    tileIndex: i,
                    issue: 'variation-overwrites-path',
                    variationTile,
                    pathTile
                });
                validation.isValid = false;
                continue;
            }
            validation.correctPlacements++;
        }
        return validation;
    }

}

module.exports.GroundVariationsValidator = GroundVariationsValidator;
