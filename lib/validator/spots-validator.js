/**
 *
 * Reldens - Tile Map Generator - SpotsValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { GraphAlgorithms } = require('../path-finder/graph-algorithms');
const { ElementPositionAnalyzer } = require('../map/element-position-analyzer');
const { TileCountingUtility } = require('../map/tile-counting-utility');
const { sc } = require('@reldens/utils');

class SpotsValidator extends MapValidator
{

    constructor()
    {
        super();
        this.graphAlgorithms = new GraphAlgorithms();
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
    }

    performValidation(map, config, options)
    {
        return this.runValidationPipeline([
            {label: 'Spot Dimensions Validation', run: () => this.validateSpotDimensions(map, config)},
            {label: 'Spot Quantities Validation', run: () => this.validateSpotQuantities(map, config)},
            {label: 'Spot Tile Types Validation', run: () => this.validateSpotTileTypes(map, config)},
            {label: 'Spot Connectivity Validation', run: () => this.validateSpotConnectivity(map, config)}
        ]);
    }

    resolveSpotKeys(config)
    {
        return Object.keys(sc.get(config, 'groundSpots', {}));
    }

    noSpotsResult(reason)
    {
        return {isValid: true, reason};
    }

    validateSpotDimensions(map, config)
    {
        let spotKeys = this.resolveSpotKeys(config);
        if(0 === spotKeys.length){
            return this.noSpotsResult('No spots configured');
        }
        let groundSpots = sc.get(config, 'groundSpots', {});
        let validation = {
            isValid: true,
            totalSpots: spotKeys.length,
            validDimensions: 0,
            invalidDimensions: 0,
            violations: []
        };
        for(let spotKey of spotKeys){
            let spotConfig = groundSpots[spotKey];
            let dimensionValidation = this.validateSingleSpotDimensions(map, spotKey, spotConfig);
            if(dimensionValidation.isValid){
                validation.validDimensions++;
                continue;
            }
            validation.invalidDimensions++;
            validation.violations.push(dimensionValidation);
            validation.isValid = false;
        }
        return validation;
    }

    validateSingleSpotDimensions(map, spotKey, spotConfig)
    {
        let expectedWidth = sc.get(spotConfig, 'width', 0);
        let expectedHeight = sc.get(spotConfig, 'height', 0);
        let spotLayers = sc.get(spotConfig, 'spotLayers', {});
        let violations = [];
        if(0 >= expectedWidth){
            violations.push('Invalid spot width: '+expectedWidth);
        }
        if(0 >= expectedHeight){
            violations.push('Invalid spot height: '+expectedHeight);
        }
        if(!sc.isObject(spotLayers)){
            violations.push('Spot must have layer definitions');
        }
        if(0 === Object.keys(spotLayers).length){
            violations.push('Spot must have layer definitions');
        }
        let actualDimensions = this.findSpotInMap(map, spotKey);
        if(actualDimensions){
            if(actualDimensions.width !== expectedWidth){
                violations.push('Width mismatch: expected '+expectedWidth+', found '+actualDimensions.width);
            }
            if(actualDimensions.height !== expectedHeight){
                violations.push('Height mismatch: expected '+expectedHeight+', found '+actualDimensions.height);
            }
        }
        return {
            isValid: 0 === violations.length,
            spotKey,
            expectedWidth,
            expectedHeight,
            actualDimensions,
            violations
        };
    }

    findSpotInMap(map, spotKey)
    {
        let layers = sc.get(map, 'layers', []);
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(-1 === layerName.indexOf(spotKey)){
                continue;
            }
            let layerData = sc.get(layer, 'data', []);
            let width = sc.get(map, 'width', 0);
            let height = sc.get(map, 'height', 0);
            let nonZeroPositions = this.elementPositionAnalyzer.findTilePositions(
                layerData,
                width,
                height,
                tile => 0 !== tile
            );
            if(0 < nonZeroPositions.length){
                let minX = Math.min(...nonZeroPositions.map(p => p.x));
                let maxX = Math.max(...nonZeroPositions.map(p => p.x));
                let minY = Math.min(...nonZeroPositions.map(p => p.y));
                let maxY = Math.max(...nonZeroPositions.map(p => p.y));
                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX + 1,
                    height: maxY - minY + 1,
                    layerName
                };
            }
        }
        return null;
    }

    validateSpotQuantities(map, config)
    {
        let spotKeys = this.resolveSpotKeys(config);
        if(0 === spotKeys.length){
            return this.noSpotsResult('No spots configured');
        }
        let groundSpots = sc.get(config, 'groundSpots', {});
        let validation = {
            isValid: true,
            totalExpected: 0,
            totalFound: 0,
            correctQuantities: 0,
            incorrectQuantities: 0,
            violations: []
        };
        for(let spotKey of spotKeys){
            let spotConfig = groundSpots[spotKey];
            let expectedQuantity = sc.get(spotConfig, 'quantity', 1);
            let spotsFound = TileCountingUtility.countSpotsInMap(map, spotKey);
            validation.totalExpected += expectedQuantity;
            validation.totalFound += spotsFound;
            if(expectedQuantity === spotsFound){
                validation.correctQuantities++;
                continue;
            }
            validation.incorrectQuantities++;
            validation.violations.push({
                spotKey,
                expected: expectedQuantity,
                found: spotsFound,
                issue: 0 === spotsFound
                    ? 'missing-spot'
                    : (spotsFound < expectedQuantity ? 'insufficient-spots' : 'excess-spots')
            });
            validation.isValid = false;
        }
        validation.accuracyPercentage = 0 === spotKeys.length
            ? 100
            : (validation.correctQuantities / spotKeys.length) * 100;
        return validation;
    }

    validateSpotTileTypes(map, config)
    {
        let spotKeys = this.resolveSpotKeys(config);
        if(0 === spotKeys.length){
            return this.noSpotsResult('No spots configured');
        }
        let groundSpots = sc.get(config, 'groundSpots', {});
        let validation = {
            isValid: true,
            totalSpots: spotKeys.length,
            correctTileTypes: 0,
            incorrectTileTypes: 0,
            violations: []
        };
        for(let spotKey of spotKeys){
            let spotConfig = groundSpots[spotKey];
            let tileTypeValidation = this.validateSpotTileTypesForSpot(map, spotKey, spotConfig);
            if(tileTypeValidation.isValid){
                validation.correctTileTypes++;
                continue;
            }
            validation.incorrectTileTypes++;
            validation.violations.push(tileTypeValidation);
            validation.isValid = false;
        }
        return validation;
    }

    validateSpotTileTypesForSpot(map, spotKey, spotConfig)
    {
        let spotLayers = sc.get(spotConfig, 'spotLayers', {});
        let violations = [];
        for(let layerKey of Object.keys(spotLayers)){
            let expectedTileData = spotLayers[layerKey];
            let actualLayer = this.findLayerByName(map, layerKey);
            if(!actualLayer){
                violations.push({
                    layerKey,
                    issue: 'spot-layer-not-found'
                });
                continue;
            }
            let tileValidation = this.validateLayerTileData(actualLayer, expectedTileData, layerKey);
            if(!tileValidation.isValid){
                violations.push(...tileValidation.violations);
            }
        }
        return {
            isValid: 0 === violations.length,
            spotKey,
            violations
        };
    }

    validateLayerTileData(layer, expectedTileData, layerKey)
    {
        let layerData = sc.get(layer, 'data', []);
        let violations = [];
        if(!sc.isArray(expectedTileData)){
            violations.push({layerKey, issue: 'expected-tile-data-not-array'});
            return {isValid: false, violations};
        }
        let nonZeroTiles = layerData.filter(tile => 0 !== tile);
        let expectedNonZeroTiles = expectedTileData.filter(tile => 0 !== tile);
        if(nonZeroTiles.length !== expectedNonZeroTiles.length){
            violations.push({
                layerKey,
                issue: 'tile-count-mismatch',
                expected: expectedNonZeroTiles.length,
                actual: nonZeroTiles.length
            });
        }
        return {isValid: 0 === violations.length, violations};
    }

    validateSpotConnectivity(map, config, maxAcceptableDistance)
    {
        if(undefined === maxAcceptableDistance){
            return {isValid: false, reason: 'maxAcceptableDistance parameter is required'};
        }
        let pathTile = sc.get(config, 'pathTile', 0);
        let spotKeys = this.resolveSpotKeys(config);
        if(0 === spotKeys.length){
            return this.noSpotsResult('No spots to validate connectivity');
        }
        if(0 === pathTile){
            return {isValid: true, reason: 'No paths to validate connectivity'};
        }
        let validation = {
            isValid: true,
            totalSpots: spotKeys.length,
            connectedSpots: 0,
            disconnectedSpots: 0,
            violations: []
        };
        let pathLayer = this.findLayerByName(map, 'path');
        if(!pathLayer){
            validation.isValid = false;
            validation.violations.push({issue: 'path-layer-not-found'});
            return validation;
        }
        for(let spotKey of spotKeys){
            let connectivityValidation = this.validateSingleSpotConnectivity(
                map,
                spotKey,
                pathTile,
                pathLayer,
                maxAcceptableDistance
            );
            if(connectivityValidation.isValid){
                validation.connectedSpots++;
                continue;
            }
            validation.disconnectedSpots++;
            validation.violations.push(connectivityValidation);
            validation.isValid = false;
        }
        validation.connectivityPercentage = 0 === validation.totalSpots
            ? 100
            : (validation.connectedSpots / validation.totalSpots) * 100;
        return validation;
    }

    validateSingleSpotConnectivity(map, spotKey, pathTile, pathLayer, maxAcceptableDistance)
    {
        let spotLocation = this.findSpotInMap(map, spotKey);
        if(!spotLocation){
            return {isValid: false, spotKey, issue: 'spot-not-found-in-map'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let pathPositions = this.elementPositionAnalyzer.findTilePositions(pathLayer.data, width, height, pathTile);
        if(0 === pathPositions.length){
            return {isValid: false, spotKey, issue: 'no-path-tiles-found'};
        }
        let spotCenter = {
            x: spotLocation.x + Math.floor(spotLocation.width / 2),
            y: spotLocation.y + Math.floor(spotLocation.height / 2)
        };
        let nearestPath = this.geometryCalculator.findNearestPosition(spotCenter, pathPositions);
        let distance = this.geometryCalculator.calculateDistanceBetweenPositions(spotCenter, nearestPath);
        let isConnected = distance <= maxAcceptableDistance;
        return {
            isValid: isConnected,
            spotKey,
            spotLocation,
            nearestPath,
            distance,
            maxAcceptableDistance,
            connected: isConnected
        };
    }

}

module.exports.SpotsValidator = SpotsValidator;
