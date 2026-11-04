/**
 *
 * Reldens - Tile Map Generator - WallsValidator
 *
 * The walls layers hold WALL tiles, which are different tiles from the spot ground ring, so every check here
 * resolves its expected tiles from the walls configuration (innerWallsTiles, innerWallsCornerTiles,
 * outerWallsTiles, outerWallsCornerTiles) and only falls back to the ground surroundingTiles and corners when a
 * walls specific set was not configured. The configured tiles use grid keys, so they are converted to position
 * names through PropertiesMapper before building the shortcuts, exactly like the generator does.
 *
 */

const { MapValidator } = require('./map-validator');
const { WallCornersValidator } = require('./wall-corners-validator');
const { TerrainsValidator } = require('./terrains-validator');
const { LayerUtility } = require('../map/layer-utility');
const { TileCountingUtility } = require('../map/tile-counting-utility');
const { PropertiesMapper } = require('../generator/properties-mapper');
const { TilesShortcuts } = require('../map/tiles-shortcuts');
const { sc } = require('@reldens/utils');

class WallsValidator extends MapValidator
{

    constructor()
    {
        super();
        this.wallCornersValidator = new WallCornersValidator();
        this.terrainsValidator = new TerrainsValidator();
    }

    performValidation(map, config)
    {
        return this.runValidationPipeline([
            {
                label: 'Inner Walls Placement Validation',
                run: () => this.validateInnerWallPlacement(map, config)
            },
            {
                label: 'Outer Walls Placement Validation',
                run: () => this.validateOuterWallPlacement(map, config)
            },
            {
                label: 'Wall Tile Types Validation',
                run: () => this.validateWallTileTypes(map, config)
            },
            {
                label: 'Corner Tiles Validation',
                run: () => this.wallCornersValidator.validateCornerTilePlacement(map, config)
            }
        ]);
    }

    buildTilesShortcuts(tilesByPosition, cornersByPosition)
    {
        let propertiesMapper = new PropertiesMapper();
        propertiesMapper.map(tilesByPosition, cornersByPosition);
        return new TilesShortcuts(
            0,
            propertiesMapper.surroundingTilesPosition,
            propertiesMapper.cornersPosition,
            '',
            propertiesMapper
        );
    }

    fetchTilesShortcuts(map, config, terrainNamePart, tilesKey, cornersKey)
    {
        let terrainShortcuts = this.terrainsValidator.fetchTerrainShortcuts(map, terrainNamePart);
        if(terrainShortcuts && 0 < this.fetchTilesValues(terrainShortcuts).length){
            return terrainShortcuts;
        }
        return this.buildTilesShortcuts(
            sc.get(config, tilesKey, sc.get(config, 'surroundingTiles', {})),
            sc.get(config, cornersKey, sc.get(config, 'corners', {}))
        );
    }

    fetchTilesValues(tilesShortcuts)
    {
        let mappedData = sc.get(tilesShortcuts, 'originalMappedData', {});
        return this.wallCornersValidator.fetchTilesValues(mappedData.surroundingTilesPosition)
            .concat(this.wallCornersValidator.fetchTilesValues(mappedData.cornersPosition));
    }

    findBordersLayer(map)
    {
        let bordersLayers = LayerUtility.findLayers(
            map,
            '-borders',
            'contains',
            (layerName) => -1 === layerName.indexOf('walls')
        );
        if(0 === bordersLayers.length){
            return null;
        }
        return bordersLayers.shift();
    }

    isTopBorderTile(tile, spotShortcuts)
    {
        if(!tile){
            return false;
        }
        return tile === spotShortcuts.cTL || tile === spotShortcuts.sTC || tile === spotShortcuts.cTR;
    }

    validateInnerWallPlacement(map, config)
    {
        let spotShortcuts = this.fetchTilesShortcuts(map, config, '', 'surroundingTiles', 'corners');
        if(0 === this.fetchTilesValues(spotShortcuts).length){
            return {isValid: true, reason: 'No surrounding tiles configured'};
        }
        let bordersLayer = this.findBordersLayer(map);
        if(!bordersLayer){
            return {isValid: false, reason: 'Spot borders layer not found for inner walls validation'};
        }
        let wallsLayer = LayerUtility.findLayer(map, '-inner-walls');
        if(!wallsLayer){
            return {isValid: false, reason: 'Inner walls layer not found'};
        }
        return this.collectInnerWallsViolations(
            {map, bordersData: bordersLayer.data, wallsData: wallsLayer.data},
            spotShortcuts,
            this.fetchTilesValues(
                this.fetchTilesShortcuts(map, config,'-inner-walls', 'innerWallsTiles', 'innerWallsCornerTiles')
            )
        );
    }

    collectInnerWallsViolations(layersData, spotShortcuts, wallsTiles)
    {
        let validation = {isValid: true, checkedBorders: 0, correctInnerWalls: 0, violations: []};
        let width = sc.get(layersData.map, 'width', 0);
        let height = sc.get(layersData.map, 'height', 0);
        for(let tileIndex = 0; tileIndex < layersData.bordersData.length; tileIndex++){
            this.validateSingleInnerWall(
                {tileIndex, width, height, bordersData: layersData.bordersData, wallsData: layersData.wallsData},
                {spotShortcuts, wallsTiles},
                validation
            );
        }
        return validation;
    }

    validateSingleInnerWall(positionData, shortcuts, validation)
    {
        let borderTile = positionData.bordersData[positionData.tileIndex];
        if(!this.isTopBorderTile(borderTile, shortcuts.spotShortcuts)){
            return false;
        }
        let belowIndex = positionData.tileIndex + positionData.width;
        let rowIndex = Math.floor(positionData.tileIndex / positionData.width);
        if(rowIndex > positionData.height - 3 || 0 !== positionData.bordersData[belowIndex]){
            return false;
        }
        validation.checkedBorders++;
        this.appendWallPairResult(validation, positionData, belowIndex, shortcuts.wallsTiles);
        return true;
    }

    appendWallPairResult(validation, positionData, belowIndex, wallsTiles)
    {
        let firstTile = positionData.wallsData[belowIndex];
        let secondTile = positionData.wallsData[belowIndex + positionData.width];
        if(-1 !== wallsTiles.indexOf(firstTile) && -1 !== wallsTiles.indexOf(secondTile)){
            validation.correctInnerWalls++;
            return;
        }
        validation.isValid = false;
        validation.violations.push({
            tileIndex: belowIndex,
            expectedTiles: wallsTiles,
            actual: [firstTile, secondTile],
            issue: 'inner-walls-pair-not-from-walls-terrain'
        });
    }

    validateWallLayers(map, config, params)
    {
        let terrainTiles = this.fetchTilesValues(
            this.fetchTilesShortcuts(map, config, params.terrainNamePart, params.tilesKey, params.cornersKey)
        );
        if(0 === terrainTiles.length){
            return {isValid: true, reason: params.notConfiguredReason};
        }
        let wallsLayers = this.terrainsValidator.fetchTerrainScopedLayers(map, params.terrainNamePart);
        if(0 === wallsLayers.length){
            return {isValid: false, reason: params.layersNotFoundReason};
        }
        let validation = Object.assign({isValid: true, violations: []}, params.counters);
        for(let wallsLayer of wallsLayers){
            params.appendViolations(validation, wallsLayer, terrainTiles);
        }
        return validation;
    }

    validateOuterWallPlacement(map, config)
    {
        return this.validateWallLayers(map, config, {
            terrainNamePart: '-outer-walls',
            tilesKey: 'outerWallsTiles',
            cornersKey: 'outerWallsCornerTiles',
            notConfiguredReason: 'No outer walls tiles configured',
            layersNotFoundReason: 'Outer walls layer not found',
            counters: {checkedOuterWalls: 0},
            appendViolations: (validation, wallsLayer) => this.appendOuterLayerViolations(validation, wallsLayer)
        });
    }

    appendOuterLayerViolations(validation, outerLayer)
    {
        let nonZeroTiles = TileCountingUtility.countNonZeroTiles(sc.get(outerLayer, 'data', []));
        validation.checkedOuterWalls += nonZeroTiles;
        if(0 !== nonZeroTiles){
            return true;
        }
        validation.isValid = false;
        validation.violations.push({layerName: outerLayer.name, issue: 'empty-outer-walls-layer'});
        return false;
    }

    validateWallTileTypes(map, config)
    {
        return this.validateWallLayers(map, config, {
            terrainNamePart: '-inner-walls',
            tilesKey: 'innerWallsTiles',
            cornersKey: 'innerWallsCornerTiles',
            notConfiguredReason: 'No surrounding tiles configured',
            layersNotFoundReason: 'Inner walls layer not found',
            counters: {correctTileTypes: 0, incorrectTileTypes: 0},
            appendViolations: (validation, wallsLayer, allowedTiles) =>
                this.appendLayerTileTypes(validation, wallsLayer, allowedTiles)
        });
    }

    appendLayerTileTypes(validation, layer, allowedTiles)
    {
        let layerData = sc.get(layer, 'data', []);
        let violations = this.classifyNonZeroTiles(layerData, allowedTiles, (tile, index) => ({
            layerName: layer.name,
            tileIndex: index,
            actualTile: tile,
            expectedTiles: allowedTiles,
            issue: 'unexpected-tile-type'
        }));
        validation.correctTileTypes += TileCountingUtility.countNonZeroTiles(layerData) - violations.length;
        validation.incorrectTileTypes += violations.length;
        validation.violations.push(...violations);
        if(0 < violations.length){
            validation.isValid = false;
        }
        return true;
    }

}

module.exports.WallsValidator = WallsValidator;
