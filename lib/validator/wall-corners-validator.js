/**
 *
 * Reldens - Tile Map Generator - WallCornersValidator
 *
 */

const { ElementPositionAnalyzer } = require('../map/element-position-analyzer');
const { TerrainsValidator } = require('./terrains-validator');
const { WangsetPositions } = require('../map/wangset-positions');
const { sc } = require('@reldens/utils');

class WallCornersValidator
{

    constructor()
    {
        this.elementPositionAnalyzer = new ElementPositionAnalyzer();
        this.terrainsValidator = new TerrainsValidator();
        this.cornerSlotToPosition = WangsetPositions.cornersSlotsPositions();
    }

    buildCornersFromShortcuts(terrainShortcuts)
    {
        let corners = {};
        for(let slotKey of Object.keys(this.cornerSlotToPosition)){
            if(terrainShortcuts[slotKey]){
                corners[this.cornerSlotToPosition[slotKey]] = terrainShortcuts[slotKey];
            }
        }
        return corners;
    }

    fetchConfiguredCorners(map, config)
    {
        let terrainShortcuts = this.terrainsValidator.fetchTerrainShortcuts(map, '-inner-walls');
        let terrainCorners = terrainShortcuts ? this.buildCornersFromShortcuts(terrainShortcuts) : {};
        if(0 < Object.keys(terrainCorners).length){
            return terrainCorners;
        }
        return sc.get(config, 'innerWallsCornerTiles', sc.get(config, 'corners', {}));
    }

    fetchTilesValues(tilesByPosition)
    {
        let sourceTiles = sc.isObject(tilesByPosition) ? tilesByPosition : {};
        let tilesValues = [];
        for(let positionKey of Object.keys(sourceTiles)){
            if(sourceTiles[positionKey]){
                tilesValues.push(sourceTiles[positionKey]);
            }
        }
        return tilesValues;
    }

    validateCornerTilePlacement(map, config)
    {
        let corners = this.fetchConfiguredCorners(map, config);
        if(0 === Object.keys(corners).length){
            return {isValid: true, reason: 'No corner tiles configured'};
        }
        let innerWallsLayers = this.terrainsValidator.fetchTerrainScopedLayers(map, '-inner-walls');
        if(0 === innerWallsLayers.length){
            return {isValid: true, reason: 'No inner walls layer for corner validation'};
        }
        let validation = {isValid: true, correctCorners: 0, incorrectCorners: 0, violations: []};
        for(let innerWallsLayer of innerWallsLayers){
            this.appendLayerCornersValidation(validation, map, innerWallsLayer, corners);
        }
        return validation;
    }

    appendLayerCornersValidation(validation, map, innerWallsLayer, corners)
    {
        for(let cornerPos of this.fetchCornersPositions(map, innerWallsLayer, corners)){
            let cornerValidation = this.validateSingleCornerPlacement(cornerPos, innerWallsLayer.data, corners);
            validation.correctCorners += cornerValidation.correctCorners;
            validation.incorrectCorners += cornerValidation.incorrectCorners;
            if(0 < cornerValidation.violations.length){
                validation.violations.push(...cornerValidation.violations);
                validation.isValid = false;
            }
        }
        return validation;
    }

    fetchCornersPositions(map, innerWallsLayer, corners)
    {
        let width = sc.get(map, 'width', 0);
        let height = sc.get(map, 'height', 0);
        let cornersPositions = [];
        for(let tile of this.fetchTilesValues(corners)){
            let positions = this.elementPositionAnalyzer.findTilePositions(innerWallsLayer.data, width, height, tile);
            cornersPositions.push(...positions);
        }
        return cornersPositions;
    }

    validateSingleCornerPlacement(cornerPos, layerData, corners)
    {
        let actualTile = layerData[cornerPos.index];
        let validation = {correctCorners: 0, incorrectCorners: 0, violations: []};
        if(this.isConfiguredCornerTile(actualTile, corners)){
            validation.correctCorners++;
            return validation;
        }
        validation.incorrectCorners++;
        validation.violations.push({
            position: cornerPos,
            actualTile,
            expectedCorners: this.fetchTilesValues(corners),
            issue: 'incorrect-corner-placement'
        });
        return validation;
    }

    isConfiguredCornerTile(actualTile, corners)
    {
        for(let slotKey of Object.keys(this.cornerSlotToPosition)){
            let expectedTile = sc.get(corners, this.cornerSlotToPosition[slotKey], 0);
            if(0 !== expectedTile && actualTile === expectedTile){
                return true;
            }
        }
        return false;
    }

}

module.exports.WallCornersValidator = WallCornersValidator;
