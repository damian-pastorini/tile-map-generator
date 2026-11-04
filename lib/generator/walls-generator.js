/**
 *
 * Reldens - Tile Map Generator - WallsGenerator
 *
 */

const { WallsMapper } = require('../map/walls-mapper');
const { InnerWalls } = require('../patterns/inner-walls');
const { OuterWalls } = require('../patterns/outer-walls');
const { OuterWallsMerge } = require('../patterns/outer-walls-merge');
const { Corners } = require('../patterns/corners');
const { Logger, sc } = require('@reldens/utils');

class WallsGenerator
{

    constructor(generator)
    {
        this.generator = generator;
        this.tileShortcutsMapper = this.generator.tileShortcutsMapper;
        this.bordersPatterns = this.generator.bordersPatterns;
        this.mapLayersComposer = this.generator.mapLayersComposer;
    }

    createLayerInnerWalls(bordersLayer, tilesKey, spotTilesShortcuts, width, height)
    {
        let innerWallsTilesShortcuts = this.tileShortcutsMapper.mapTilesShortcuts(tilesKey, spotTilesShortcuts.p, null, '-inner-walls');
        let wallsLayerData = Array(bordersLayer.length).fill(0);
        for(let rowIndex = 0; rowIndex < height - 2; rowIndex++){
            for(let columnIndex = 0; columnIndex < width; columnIndex++){
                let tileIndex = rowIndex * width + columnIndex;
                let currentTile = bordersLayer[tileIndex];
                let isTopBorder = this.isTopBorderTile(currentTile, spotTilesShortcuts);
                if(!isTopBorder){
                    continue;
                }
                let belowTileIndex = (rowIndex + 1) * width + columnIndex;
                if(0 !== bordersLayer[belowTileIndex]){
                    continue;
                }
                let wallTiles = this.determineWallTiles(innerWallsTilesShortcuts, spotTilesShortcuts, currentTile);
                if(!wallTiles){
                    continue;
                }
                this.placeWallTiles(wallsLayerData, columnIndex, rowIndex, width, wallTiles);
            }
        }
        return wallsLayerData;
    }

    async createLayerOuterWalls(bordersLayer, tilesKey, spotTiles, width, height, wallsLayer)
    {
        let outerWallsTiles = this.tileShortcutsMapper.mapTilesShortcuts(tilesKey, spotTiles.p, null, '-outer-walls');
        let outerWallsLayer = Array(bordersLayer.length).fill(0);
        let mapper = new WallsMapper(spotTiles, outerWallsTiles);
        let mappedPositions = mapper.mappedPositions();
        let oppositeTiles = mapper.oppositeTiles();
        for(let rowIndex = 0; rowIndex < height; rowIndex++){
            for(let columnIndex = 0; columnIndex < width; columnIndex++){
                let borderTileIndex = rowIndex * width + columnIndex;
                let borderTile = bordersLayer[borderTileIndex];
                if(0 === borderTile){
                    continue;
                }
                let oppositeBorderTiles = oppositeTiles[borderTile];
                if(!oppositeBorderTiles){
                    Logger.debug('None opposite border tiles defined for borderTile "'+borderTile+'".');
                    continue;
                }
                let oppositeBorderTilesPositions = mappedPositions[borderTile];
                if(!oppositeBorderTilesPositions){
                    Logger.debug('None opposite border tiles positions defined for borderTile "'+borderTile+'".');
                    continue;
                }
                if(oppositeBorderTiles.length !== oppositeBorderTilesPositions.length){
                    Logger.debug('Opposite border tiles and positions miss match for borderTile "'+borderTile+'".');
                    continue;
                }
                outerWallsLayer = await this.placeOuterWallTile(
                    outerWallsLayer,
                    columnIndex,
                    rowIndex,
                    width,
                    oppositeBorderTiles,
                    oppositeBorderTilesPositions,
                    bordersLayer,
                    wallsLayer
                );
            }
        }
        return this.applyPatternsThroughMerge(
            this.applyOuterWallsPatterns(outerWallsLayer, width, height, spotTiles, outerWallsTiles),
            bordersLayer,
            width,
            height,
            spotTiles,
            outerWallsTiles
        );
    }

    fixInnerWallsPatterns(layerData, tilesShortcuts, mapWidth)
    {
        if(!this.mapLayersComposer.isValidLayer(layerData)){
            return;
        }
        let { step1 } = InnerWalls.sequences(tilesShortcuts);
        this.bordersPatterns.replaceSequences(layerData, step1, mapWidth);
        return layerData;
    }

    applyOuterWallsPatterns(outerWallsLayer, mapWidth, mapHeight, spotTiles, outerTiles)
    {
        let fixedLayer = [...outerWallsLayer];
        let { step1, step2, step3, step4, step5 } = OuterWalls.sequences(spotTiles, outerTiles);
        this.bordersPatterns.replaceSequences(fixedLayer, step1, mapWidth);
        this.replaceCornersPatters(fixedLayer, mapWidth, spotTiles, outerTiles);
        fixedLayer = this.bordersPatterns.rotateLayer90Degrees(fixedLayer, mapWidth, mapHeight);
        this.replaceCornersPatters(fixedLayer, mapHeight, spotTiles, outerTiles);
        this.bordersPatterns.replaceSequences(fixedLayer, step2, mapHeight);
        fixedLayer = this.bordersPatterns.rollbackRotation90Degrees(fixedLayer, mapHeight, mapWidth);
        this.bordersPatterns.replaceSequences(fixedLayer, step3, mapWidth);
        fixedLayer = this.bordersPatterns.rotateLayer90Degrees(fixedLayer, mapWidth, mapHeight);
        this.bordersPatterns.replaceSequences(fixedLayer, step4, mapHeight);
        fixedLayer = this.bordersPatterns.rollbackRotation90Degrees(fixedLayer, mapHeight, mapWidth);
        this.bordersPatterns.replaceSequences(fixedLayer, step5, mapWidth);
        return fixedLayer;
    }

    applyPatternsThroughMerge(outerWallsLayer, bordersLayer, mapWidth, mapHeight, spotTiles, outerTiles)
    {
        let mergedLayers = this.mapLayersComposer.mergeLayers([...outerWallsLayer], [...bordersLayer]);
        let outerTc = sc.get(outerTiles, 'tC', 0);
        let { step1, step2, step3, step4, step5, step6, step7, step8 } = OuterWallsMerge.sequences(
            spotTiles,
            outerTiles,
            outerTc
        );
        this.bordersPatterns.replaceSequences(mergedLayers, step1, mapWidth);
        mergedLayers = this.bordersPatterns.rotateLayer90Degrees(mergedLayers, mapWidth, mapHeight);
        this.bordersPatterns.replaceSequences(mergedLayers, step2, mapHeight);
        if(outerTc){
            this.bordersPatterns.replaceSequences(mergedLayers, step3, mapHeight);
        }
        mergedLayers = this.bordersPatterns.rollbackRotation90Degrees(mergedLayers, mapHeight, mapWidth);
        this.bordersPatterns.replaceSequences(mergedLayers, step4, mapWidth);
        if(outerTc){
            this.bordersPatterns.replaceSequences(mergedLayers, step5, mapWidth);
        }
        this.bordersPatterns.replaceSequences(mergedLayers, step6, mapWidth);
        mergedLayers = this.bordersPatterns.rotateLayer90Degrees(mergedLayers, mapWidth, mapHeight);
        this.bordersPatterns.replaceSequences(mergedLayers, step7, mapHeight);
        mergedLayers = this.bordersPatterns.rollbackRotation90Degrees(mergedLayers, mapHeight, mapWidth);
        this.bordersPatterns.replaceSequences(mergedLayers, step8, mapWidth);
        let originalBordersLayer = [...bordersLayer];
        let { cBL, cBR } = spotTiles;
        for(let i = 0; i < mergedLayers.length; i++){
            if(0 === mergedLayers[i]){
                outerWallsLayer[i] = 0;
                bordersLayer[i] = 0;
                continue;
            }
            outerWallsLayer[i] = mergedLayers[i];
            if(0 !== originalBordersLayer[i] && 0 !== outerWallsLayer[i]){
                bordersLayer[i] = mergedLayers[i];
            }
            if(
                cBR === mergedLayers[i]
                && (outerTiles.sMC === mergedLayers[i - 1] || outerTiles.sML === mergedLayers[i - 1])
            ){
                bordersLayer[i] = outerTiles.sMC;
            }
            if(
                cBL === mergedLayers[i]
                && (outerTiles.sMC === mergedLayers[i + 1] || outerTiles.sMR === mergedLayers[i + 1])
            ){
                bordersLayer[i] = outerTiles.sMC;
            }
        }
        return {outerWallsLayer, bordersLayer};
    }

    replaceCornersPatters(fixedLayer, mapWidth, spotTiles, outerTiles)
    {
        let { step1, step2 } = Corners.sequences(spotTiles, outerTiles);
        this.bordersPatterns.replaceSequences(fixedLayer, step1, mapWidth);
        if(outerTiles){
            this.bordersPatterns.replaceSequences(fixedLayer, step2, mapWidth);
        }
    }

    async placeOuterWallTile(outerWallsLayer, x, y, width, oppositeTiles, oppositePositions, bordersLayer, wallsLayer)
    {
        for(let i = 0; i < oppositeTiles.length; i++){
            let tileIdx = (y + oppositePositions[i].y) * width + x + oppositePositions[i].x;
            if(wallsLayer && 0 !== wallsLayer[tileIdx]){
                continue;
            }
            outerWallsLayer[tileIdx] = oppositeTiles[i];
        }
        return outerWallsLayer;
    }

    determineWallTiles(innerWallsTilesShortcuts, spotTilesShortcuts, currentTile)
    {
        if(!this.isTopBorderTile(currentTile, spotTilesShortcuts)){
            return null;
        }
        if(currentTile === spotTilesShortcuts.cTL){
            return this.fetchResolvedWallTiles(
                innerWallsTilesShortcuts.sML,
                innerWallsTilesShortcuts.cTL,
                innerWallsTilesShortcuts.sBL
            );
        }
        if(currentTile === spotTilesShortcuts.sTC){
            return this.fetchResolvedWallTiles(
                innerWallsTilesShortcuts.sMC,
                innerWallsTilesShortcuts.sTC,
                innerWallsTilesShortcuts.sBC
            );
        }
        return this.fetchResolvedWallTiles(
            innerWallsTilesShortcuts.sMR,
            innerWallsTilesShortcuts.cTR,
            innerWallsTilesShortcuts.sBR
        );
    }

    fetchResolvedWallTiles(middleWallTile, topWallTile, bottomWallTile)
    {
        if(!middleWallTile || !topWallTile){
            Logger.debug('Inner walls tiles were not resolved.', middleWallTile, topWallTile);
            return null;
        }
        if(!bottomWallTile){
            return [middleWallTile, topWallTile];
        }
        return [middleWallTile, topWallTile, bottomWallTile];
    }

    placeWallTiles(wallsLayerData, x, y, width, wallTiles)
    {
        for(let wallRowIndex = 0; wallRowIndex < wallTiles.length; wallRowIndex++){
            wallsLayerData[(y + 1 + wallRowIndex) * width + x] = wallTiles[wallRowIndex];
        }
    }

    isTopBorderTile(tile, spotTilesShortcuts)
    {
        if(!tile){
            return false;
        }
        return tile === spotTilesShortcuts.cTL || tile === spotTilesShortcuts.sTC || tile === spotTilesShortcuts.cTR;
    }

}

module.exports.WallsGenerator = WallsGenerator;
