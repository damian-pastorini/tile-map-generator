/**
 *
 * Reldens - Tile Map Generator - WallsValidator
 *
 */

const { MapValidator } = require('./map-validator');
const { ElementPositionAnalyzer } = require('../utilities/element-position-analyzer');
const { WallsMapper } = require('../map/walls-mapper');
const { TilesShortcuts } = require('../map/tiles-shortcuts');
const { sc } = require('@reldens/utils');

class WallsValidator extends MapValidator
{

    constructor()
    {
        super();
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
        this.wallsMapper = null;
        this.tilesShortcuts = null;
    }

    performValidation(map, config, options)
    {
        this.initializeWallComponents(config);
        let innerWallsValidation = this.validateInnerWallPlacement(map, config);
        this.logValidationResult('Inner Walls Placement Validation', innerWallsValidation);
        if(!innerWallsValidation.isValid){
            return false;
        }
        let outerWallsValidation = this.validateOuterWallPlacement(map, config);
        this.logValidationResult('Outer Walls Placement Validation', outerWallsValidation);
        if(!outerWallsValidation.isValid){
            return false;
        }
        let wallTileTypesValidation = this.validateWallTileTypes(map, config);
        this.logValidationResult('Wall Tile Types Validation', wallTileTypesValidation);
        if(!wallTileTypesValidation.isValid){
            return false;
        }
        let cornerTilesValidation = this.validateCornerTilePlacement(map, config);
        this.logValidationResult('Corner Tiles Validation', cornerTilesValidation);
        return cornerTilesValidation.isValid;
    }

    initializeWallComponents(config)
    {
        let pathTile = sc.get(config, 'pathTile', 0);
        let surroundingTiles = sc.get(config, 'surroundingTiles', {});
        let corners = sc.get(config, 'corners', {});
        this.tilesShortcuts = new TilesShortcuts(pathTile, surroundingTiles, corners);
        this.wallsMapper = new WallsMapper(this.tilesShortcuts, this.tilesShortcuts);
    }

    findLayerByNamePrefix(map, namePrefix)
    {
        let layers = sc.get(map, 'layers', []);
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(0 === layerName.indexOf(namePrefix)){
                return layer;
            }
        }
        return null;
    }

    validateInnerWallPlacement(map, config)
    {
        let surroundingTiles = sc.get(config, 'surroundingTiles', {});
        if(0 === Object.keys(surroundingTiles).length){
            return {isValid: true, reason: 'No surrounding tiles configured'};
        }
        let innerWallsLayer = this.findLayerByNamePrefix(map, 'inner-walls');
        if(!innerWallsLayer){
            return {isValid: false, reason: 'Inner walls layer not found'};
        }
        let spotBordersLayer = this.findLayerByNamePrefix(map, 'borders');
        if(!spotBordersLayer){
            return {isValid: false, reason: 'Spot borders layer not found for inner walls validation'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let borderPositions = this.elementPositionAnalyzer.findTilePositions(
            spotBordersLayer.data,
            width,
            height,
            tile => 0 !== tile
        );
        let validation = {
            isValid: true,
            totalBorderTiles: borderPositions.length,
            correctInnerWalls: 0,
            incorrectInnerWalls: 0,
            missingInnerWalls: 0,
            violations: []
        };
        for(let borderPos of borderPositions){
            let innerWallValidation = this.validateInnerWallsAroundBorder(
                borderPos,
                innerWallsLayer.data,
                width,
                height,
                surroundingTiles
            );
            validation.correctInnerWalls += innerWallValidation.correctWalls;
            validation.incorrectInnerWalls += innerWallValidation.incorrectWalls;
            validation.missingInnerWalls += innerWallValidation.missingWalls;
            if(0 < innerWallValidation.violations.length){
                validation.violations.push({
                    borderPosition: borderPos,
                    violations: innerWallValidation.violations
                });
                validation.isValid = false;
            }
        }
        return validation;
    }

    validateInnerWallsAroundBorder(borderPos, innerWallsData, width, height, surroundingTiles)
    {
        let neighbors = this.getPathNeighbors(borderPos.x, borderPos.y, width, height, innerWallsData);
        let validation = {
            correctWalls: 0,
            incorrectWalls: 0,
            missingWalls: 0,
            violations: []
        };
        let expectedWallPositions = [
            {key: '-1,-1', tile: sc.get(surroundingTiles, '-1,-1', 0)},
            {key: '-1,0', tile: sc.get(surroundingTiles, '-1,0', 0)},
            {key: '-1,1', tile: sc.get(surroundingTiles, '-1,1', 0)},
            {key: '0,-1', tile: sc.get(surroundingTiles, '0,-1', 0)},
            {key: '0,1', tile: sc.get(surroundingTiles, '0,1', 0)},
            {key: '1,-1', tile: sc.get(surroundingTiles, '1,-1', 0)},
            {key: '1,0', tile: sc.get(surroundingTiles, '1,0', 0)},
            {key: '1,1', tile: sc.get(surroundingTiles, '1,1', 0)}
        ];
        for(let expectedWall of expectedWallPositions){
            if(0 === expectedWall.tile){
                continue;
            }
            let actualTile = sc.get(neighbors, expectedWall.key, null);
            if(null === actualTile){
                validation.missingWalls++;
                validation.violations.push({
                    position: expectedWall.key,
                    expected: expectedWall.tile,
                    actual: 'out-of-bounds',
                    issue: 'missing-wall-boundary'
                });
                continue;
            }
            if(actualTile === expectedWall.tile){
                validation.correctWalls++;
                continue;
            }
            if(0 !== actualTile){
                validation.incorrectWalls++;
                validation.violations.push({
                    position: expectedWall.key,
                    expected: expectedWall.tile,
                    actual: actualTile,
                    issue: 'incorrect-wall-tile'
                });
            }
        }
        return validation;
    }

    getPathNeighbors(centerX, centerY, width, height, layerData)
    {
        let neighbors = {};
        let directions = [
            {key: '-1,-1', dx: -1, dy: -1},
            {key: '-1,0', dx: -1, dy: 0},
            {key: '-1,1', dx: -1, dy: 1},
            {key: '0,-1', dx: 0, dy: -1},
            {key: '0,1', dx: 0, dy: 1},
            {key: '1,-1', dx: 1, dy: -1},
            {key: '1,0', dx: 1, dy: 0},
            {key: '1,1', dx: 1, dy: 1}
        ];
        for(let direction of directions){
            let x = centerX + direction.dx;
            let y = centerY + direction.dy;
            if(0 <= x && x < width && 0 <= y && y < height){
                let index = y * width + x;
                neighbors[direction.key] = layerData[index];
                continue;
            }
            neighbors[direction.key] = null;
        }
        return neighbors;
    }

    validateOuterWallPlacement(map, config)
    {
        let surroundingTiles = sc.get(config, 'surroundingTiles', {});
        if(0 === Object.keys(surroundingTiles).length){
            return {isValid: true, reason: 'No surrounding tiles configured'};
        }
        let outerWallsLayer = this.findLayerByNamePrefix(map, 'outer-walls');
        if(!outerWallsLayer){
            return {isValid: false, reason: 'Outer walls layer not found'};
        }
        let innerWallsLayer = this.findLayerByNamePrefix(map, 'inner-walls');
        if(!innerWallsLayer){
            return {isValid: false, reason: 'Inner walls layer required for outer walls validation'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let innerWallPositions = this.elementPositionAnalyzer.findTilePositions(
            innerWallsLayer.data,
            width,
            height,
            tile => 0 !== tile
        );
        let validation = {
            isValid: true,
            totalInnerWalls: innerWallPositions.length,
            correctOuterWalls: 0,
            incorrectOuterWalls: 0,
            missingOuterWalls: 0,
            violations: []
        };
        for(let innerWallPos of innerWallPositions){
            let outerWallValidation = this.validateOuterWallsAroundInnerWall(
                innerWallPos,
                outerWallsLayer.data,
                width,
                height,
                surroundingTiles
            );
            validation.correctOuterWalls += outerWallValidation.correctWalls;
            validation.incorrectOuterWalls += outerWallValidation.incorrectWalls;
            validation.missingOuterWalls += outerWallValidation.missingWalls;
            if(0 < outerWallValidation.violations.length){
                validation.violations.push({
                    innerWallPosition: innerWallPos,
                    violations: outerWallValidation.violations
                });
                validation.isValid = false;
            }
        }
        return validation;
    }

    validateOuterWallsAroundInnerWall(innerWallPos, outerWallsData, width, height, surroundingTiles)
    {
        let neighbors = this.getPathNeighbors(innerWallPos.x, innerWallPos.y, width, height, outerWallsData);
        let validation = {
            correctWalls: 0,
            incorrectWalls: 0,
            missingWalls: 0,
            violations: []
        };
        let expectedTileValues = Object.values(surroundingTiles);
        for(let key of Object.keys(neighbors)){
            let actualTile = neighbors[key];
            if(null === actualTile || 0 === actualTile){
                continue;
            }
            if(-1 !== expectedTileValues.indexOf(actualTile)){
                validation.correctWalls++;
                continue;
            }
            validation.incorrectWalls++;
            validation.violations.push({
                position: key,
                expected: expectedTileValues,
                actual: actualTile,
                issue: 'incorrect-outer-wall-tile'
            });
        }
        return validation;
    }

    validateWallTileTypes(map, config)
    {
        let surroundingTiles = sc.get(config, 'surroundingTiles', {});
        if(0 === Object.keys(surroundingTiles).length){
            return {isValid: true, reason: 'No surrounding tiles configured'};
        }
        let innerWallsLayer = this.findLayerByNamePrefix(map, 'inner-walls');
        let outerWallsLayer = this.findLayerByNamePrefix(map, 'outer-walls');
        let validation = {
            isValid: true,
            correctTileTypes: 0,
            incorrectTileTypes: 0,
            violations: []
        };
        if(innerWallsLayer){
            let innerValidation = this.validateLayerTileTypes(innerWallsLayer, surroundingTiles, 'inner-walls');
            validation.correctTileTypes += innerValidation.correctTileTypes;
            validation.incorrectTileTypes += innerValidation.incorrectTileTypes;
            validation.violations.push(...innerValidation.violations);
            if(!innerValidation.isValid){
                validation.isValid = false;
            }
        }
        if(outerWallsLayer){
            let outerValidation = this.validateLayerTileTypes(outerWallsLayer, surroundingTiles, 'outer-walls');
            validation.correctTileTypes += outerValidation.correctTileTypes;
            validation.incorrectTileTypes += outerValidation.incorrectTileTypes;
            validation.violations.push(...outerValidation.violations);
            if(!outerValidation.isValid){
                validation.isValid = false;
            }
        }
        return validation;
    }

    validateLayerTileTypes(layer, expectedTileTypes, layerType)
    {
        let layerData = sc.get(layer, 'data', []);
        let expectedTileValues = Object.values(expectedTileTypes);
        let validation = {
            isValid: true,
            correctTileTypes: 0,
            incorrectTileTypes: 0,
            violations: []
        };
        for(let i = 0; i < layerData.length; i++){
            let tile = layerData[i];
            if(0 === tile){
                continue;
            }
            if(-1 !== expectedTileValues.indexOf(tile)){
                validation.correctTileTypes++;
                continue;
            }
            validation.incorrectTileTypes++;
            validation.violations.push({
                layerType,
                tileIndex: i,
                actualTile: tile,
                expectedTiles: expectedTileValues,
                issue: 'unexpected-tile-type'
            });
            validation.isValid = false;
        }
        return validation;
    }

    validateCornerTilePlacement(map, config)
    {
        let corners = sc.get(config, 'corners', {});
        if(0 === Object.keys(corners).length){
            return {isValid: true, reason: 'No corner tiles configured'};
        }
        let innerWallsLayer = this.findLayerByNamePrefix(map, 'inner-walls');
        if(!innerWallsLayer){
            return {isValid: true, reason: 'No inner walls layer for corner validation'};
        }
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let validation = {
            isValid: true,
            correctCorners: 0,
            incorrectCorners: 0,
            missingCorners: 0,
            violations: []
        };
        let cornerTileValues = Object.values(corners);
        let cornerPositions = [];
        for(let tile of cornerTileValues){
            let positions = this.elementPositionAnalyzer.findTilePositions(innerWallsLayer.data, width, height, tile);
            cornerPositions.push(...positions);
        }
        for(let cornerPos of cornerPositions){
            let cornerValidation = this.validateSingleCornerPlacement(
                cornerPos,
                innerWallsLayer.data,
                width,
                height,
                corners
            );
            validation.correctCorners += cornerValidation.correctCorners;
            validation.incorrectCorners += cornerValidation.incorrectCorners;
            validation.missingCorners += cornerValidation.missingCorners;
            if(0 < cornerValidation.violations.length){
                validation.violations.push(...cornerValidation.violations);
                validation.isValid = false;
            }
        }
        return validation;
    }

    validateSingleCornerPlacement(cornerPos, layerData, width, height, corners)
    {
        let actualTile = layerData[cornerPos.index];
        let validation = {
            correctCorners: 0,
            incorrectCorners: 0,
            missingCorners: 0,
            violations: []
        };
        let cornerPositions = [
            {key: '-1,-1', dx: -1, dy: -1},
            {key: '-1,1', dx: -1, dy: 1},
            {key: '1,-1', dx: 1, dy: -1},
            {key: '1,1', dx: 1, dy: 1}
        ];
        let isValidCorner = false;
        for(let cornerDef of cornerPositions){
            let expectedTile = sc.get(corners, cornerDef.key, 0);
            if(0 === expectedTile){
                continue;
            }
            if(actualTile === expectedTile){
                validation.correctCorners++;
                isValidCorner = true;
                break;
            }
        }
        if(!isValidCorner){
            validation.incorrectCorners++;
            validation.violations.push({
                position: cornerPos,
                actualTile,
                expectedCorners: Object.values(corners),
                issue: 'incorrect-corner-placement'
            });
        }
        return validation;
    }

}

module.exports.WallsValidator = WallsValidator;
