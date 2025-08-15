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
        this.mapTilesShortcuts = generator.mapTilesShortcuts.bind(generator);
        this.replaceSequences = generator.replaceSequences.bind(generator);
        this.replaceSequence = generator.replaceSequence.bind(generator);
        this.rotateLayer90Degrees = generator.rotateLayer90Degrees.bind(generator);
        this.rollbackRotation90Degrees = generator.rollbackRotation90Degrees.bind(generator);
        this.isValidLayer = generator.isValidLayer.bind(generator);
        this.mergeLayers = generator.mergeLayers.bind(generator);
    }

    createLayerInnerWalls(bordersLayer, tilesKey, spotTilesShortcuts, width, height)
    {
        let innerWallsTilesShortcuts = this.mapTilesShortcuts(tilesKey, spotTilesShortcuts.p, null, '-inner-walls');
        let wallsLayerData = Array(bordersLayer.length).fill(0);
        for(let y = 0; y < height - 2; y++){
            for(let x = 0; x < width; x++){
                let tileIndex = y * width + x;
                let currentTile = bordersLayer[tileIndex];
                let isTopBorder = this.isTopBorderTile(currentTile, spotTilesShortcuts);
                if(!isTopBorder){
                    continue;
                }
                let belowTileIndex = (y + 1) * width + x;
                if(0 !== bordersLayer[belowTileIndex]){
                    continue;
                }
                let wallTiles = this.determineWallTiles(innerWallsTilesShortcuts, spotTilesShortcuts, currentTile);
                if(!wallTiles){
                    continue;
                }
                this.placeWallTiles(wallsLayerData, x, y, width, wallTiles);
            }
        }
        return wallsLayerData;
    }

    async createLayerOuterWalls(bordersLayer, tilesKey, spotTiles, width, height, wallsLayer)
    {
        let outerWallsTiles = this.mapTilesShortcuts(tilesKey, spotTiles.p, null, '-outer-walls');
        let outerWallsLayer = Array(bordersLayer.length).fill(0);
        let mapper = new WallsMapper(spotTiles, outerWallsTiles);
        let mappedPositions = mapper.mappedPositions();
        let oppositeTiles = mapper.oppositeTiles();
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let borderTileIndex = y * width + x;
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
                    x,
                    y,
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

    fixInnerWallsPatterns(layerData, tilesShortcuts, mapWidth, mapHeight)
    {
        if(!this.isValidLayer(layerData)){
            return;
        }
        let { step1 } = InnerWalls.sequences(tilesShortcuts);
        this.replaceSequences(layerData, step1, mapWidth);
        return layerData;
    }

    applyOuterWallsPatterns(outerWallsLayer, mapWidth, mapHeight, spotTiles, outerTiles)
    {
        let fixedLayer = [...outerWallsLayer];
        let { step1, step2, step3, step4, step5 } = OuterWalls.sequences(spotTiles, outerTiles);
        this.replaceSequences(fixedLayer, step1, mapWidth);
        this.replaceCornersPatters(fixedLayer, mapWidth, spotTiles, outerTiles);
        fixedLayer = this.rotateLayer90Degrees(fixedLayer, mapWidth, mapHeight);
        this.replaceCornersPatters(fixedLayer, mapHeight, spotTiles, outerTiles);
        this.replaceSequences(fixedLayer, step2, mapHeight);
        fixedLayer = this.rollbackRotation90Degrees(fixedLayer, mapHeight, mapWidth);
        this.replaceSequences(fixedLayer, step3, mapWidth);
        fixedLayer = this.rotateLayer90Degrees(fixedLayer, mapWidth, mapHeight);
        this.replaceSequences(fixedLayer, step4, mapHeight);
        fixedLayer = this.rollbackRotation90Degrees(fixedLayer, mapHeight, mapWidth);
        this.replaceSequences(fixedLayer, step5, mapWidth);
        return fixedLayer;
    }

    applyPatternsThroughMerge(outerWallsLayer, bordersLayer, mapWidth, mapHeight, spotTiles, outerTiles)
    {
        let mergedLayers = this.mergeLayers([...outerWallsLayer], [...bordersLayer]);
        let outerTc = sc.get(outerTiles, 'tC', 0);
        let { step1, step2, step3, step4, step5, step6, step7, step8 } = OuterWallsMerge.sequences(
            spotTiles,
            outerTiles,
            outerTc
        );
        this.replaceSequences(mergedLayers, step1, mapWidth);
        mergedLayers = this.rotateLayer90Degrees(mergedLayers, mapWidth, mapHeight);
        this.replaceSequences(mergedLayers, step2, mapHeight);
        if(outerTc){
            this.replaceSequences(mergedLayers, step3, mapHeight);
        }
        mergedLayers = this.rollbackRotation90Degrees(mergedLayers, mapHeight, mapWidth);
        this.replaceSequences(mergedLayers, step4, mapWidth);
        if(outerTc){
            this.replaceSequences(mergedLayers, step5, mapWidth);
        }
        this.replaceSequences(mergedLayers, step6, mapWidth);
        mergedLayers = this.rotateLayer90Degrees(mergedLayers, mapWidth, mapHeight);
        this.replaceSequences(mergedLayers, step7, mapHeight);
        mergedLayers = this.rollbackRotation90Degrees(mergedLayers, mapHeight, mapWidth);
        this.replaceSequences(mergedLayers, step8, mapWidth);
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
        this.replaceSequences(fixedLayer, step1, mapWidth);
        if(outerTiles){
            this.replaceSequences(fixedLayer, step2, mapWidth);
        }
    }

    async placeOuterWallTile(outerWallsLayer, x, y, width, oppositeTiles, oppositePositions, bordersLayer, wallsLayer)
    {
        for(let i = 0; i < oppositeTiles.length; i++){
            let tileIdx = (y + oppositePositions[i].y) * width + x + oppositePositions[i].x;
            if(0 !== wallsLayer[tileIdx]){
                continue;
            }
            outerWallsLayer[tileIdx] = oppositeTiles[i];
        }
        return outerWallsLayer;
    }

    determineWallTiles(innerWallsTilesShortcuts, spotTilesShortcuts, currentTile)
    {
        if(currentTile === spotTilesShortcuts.cTL){
            return [innerWallsTilesShortcuts.sML, innerWallsTilesShortcuts.cTL];
        }
        if(currentTile === spotTilesShortcuts.sTC){
            return [innerWallsTilesShortcuts.sMC, innerWallsTilesShortcuts.sTC];
        }
        if(currentTile === spotTilesShortcuts.cTR){
            return [innerWallsTilesShortcuts.sMR, innerWallsTilesShortcuts.cTR];
        }
        return null;
    }

    placeWallTiles(wallsLayerData, x, y, width, wallTiles)
    {
        let wallTileY1 = y + 1;
        let wallTileY2 = y + 2;
        let wallTileIndex1 = wallTileY1 * width + x;
        let wallTileIndex2 = wallTileY2 * width + x;
        wallsLayerData[wallTileIndex1] = wallTiles[0];
        wallsLayerData[wallTileIndex2] = wallTiles[1];
    }

    isTopBorderTile(tile, spotTilesShortcuts)
    {
        return tile === spotTilesShortcuts.cTL || tile === spotTilesShortcuts.sTC || tile === spotTilesShortcuts.cTR;
    }

}

module.exports.WallsGenerator = WallsGenerator;
