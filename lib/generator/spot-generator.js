/**
 *
 * Reldens - SpotGenerator
 *
 */

const { PropertiesMapper } = require('./properties-mapper');
const { TilesShortcuts } = require('../map/tiles-shortcuts');
const { Logger, sc } = require('@reldens/utils');

class SpotGenerator
{

    constructor(spotLayersBuilder, spotFillProcessor, spotBordersAndCorners, spotBorderAnalyzer, wallsGenerator, tileShortcutsMapper, generator)
    {
        this.spotLayersBuilder = spotLayersBuilder;
        this.spotFillProcessor = spotFillProcessor;
        this.spotBordersAndCorners = spotBordersAndCorners;
        this.spotBorderAnalyzer = spotBorderAnalyzer;
        this.wallsGenerator = wallsGenerator;
        this.tileShortcutsMapper = tileShortcutsMapper;
        this.generator = generator;
        this.groundSpots = generator.groundSpots;
        this.groundSpotsPropertiesMappers = generator.groundSpotsPropertiesMappers;
        this.groundTile = generator.groundTile;
        this.pathTile = generator.pathTile;
        this.pathSize = generator.pathSize;
        this.elementsVariations = generator.elementsVariations;
        this.surroundingTiles = sc.get(generator, 'surroundingTiles', {});
        this.corners = sc.get(generator, 'corners', {});
    }

    buildSpotTerrainPositions(spotTilesShortcuts, spotTile)
    {
        let mappedData = sc.get(spotTilesShortcuts, 'originalMappedData', {});
        let terrainPositions = {
            surroundingTilesPosition: Object.assign({}, sc.get(mappedData, 'surroundingTilesPosition', {})),
            cornersPosition: Object.assign({}, sc.get(mappedData, 'cornersPosition', {}))
        };
        if(!terrainPositions.surroundingTilesPosition['middle-center'] && spotTile){
            terrainPositions.surroundingTilesPosition['middle-center'] = spotTile;
        }
        return terrainPositions;
    }

    appendSpotTerrains(spotsTerrains, tilesKey, groundSpotConfig, spotTilesShortcuts, spotTile)
    {
        if(0 === Object.keys(sc.get(groundSpotConfig, 'spotLayers', {})).length){
            return false;
        }
        spotsTerrains[tilesKey] = this.buildSpotTerrainPositions(spotTilesShortcuts, spotTile);
        let wallsTerrains = {
            '-inner-walls': groundSpotConfig.borderInnerWalls,
            '-outer-walls': groundSpotConfig.borderOuterWalls
        };
        for(let wallsSuffix of Object.keys(wallsTerrains)){
            if(!wallsTerrains[wallsSuffix]){
                continue;
            }
            spotsTerrains[tilesKey+wallsSuffix] = this.tileShortcutsMapper.mapTilesShortcuts(
                tilesKey,
                spotTilesShortcuts.p,
                null,
                wallsSuffix
            ).originalMappedData;
        }
        return true;
    }

    fetchSpotPropertiesMapper(tilesKey, groundSpotConfig)
    {
        let spotPropertiesMapper = this.groundSpotsPropertiesMappers[tilesKey];
        if(spotPropertiesMapper){
            spotPropertiesMapper.map();
            return spotPropertiesMapper;
        }
        if(TilesShortcuts.fetchWangsetByName(tilesKey, this.generator.optimizedMapFirstTileset)){
            return null;
        }
        let surroundingTiles = sc.get(groundSpotConfig, 'surroundingTiles', this.surroundingTiles);
        let corners = sc.get(groundSpotConfig, 'corners', this.corners);
        if(0 === Object.keys(surroundingTiles).length && 0 === Object.keys(corners).length){
            Logger.debug('Ground spot "'+tilesKey+'" has no tiles properties, wangset or configured tiles.');
            return null;
        }
        this.groundSpotsPropertiesMappers[tilesKey] = new PropertiesMapper(tilesKey).map(surroundingTiles, corners);
        return this.groundSpotsPropertiesMappers[tilesKey];
    }

    async generateSpotWalls(groundSpotConfig, tilesKey, spotLayer, bordersLayer, spotTile, spotTilesShortcuts)
    {
        let wallsLayer = false;
        let outerWallsLayer = false;
        if(!groundSpotConfig.applyCornersTiles){
            return {spotLayer, bordersLayer, wallsLayer, outerWallsLayer};
        }
        spotLayer = this.spotFillProcessor.fillEmptyTilesBetweenBordersAndSpotGround(
            spotLayer,
            bordersLayer,
            groundSpotConfig.width,
            groundSpotConfig.height,
            spotTile
        );
        if(groundSpotConfig.borderInnerWalls){
            wallsLayer = this.wallsGenerator.createLayerInnerWalls(
                bordersLayer,
                tilesKey,
                spotTilesShortcuts,
                groundSpotConfig.width,
                groundSpotConfig.height
            );
        }
        if(groundSpotConfig.borderOuterWalls){
            let outerWallsResult = await this.wallsGenerator.createLayerOuterWalls(
                bordersLayer,
                tilesKey,
                spotTilesShortcuts,
                groundSpotConfig.width,
                groundSpotConfig.height,
                wallsLayer
            );
            outerWallsLayer = outerWallsResult.outerWallsLayer;
            bordersLayer = outerWallsResult.bordersLayer;
        }
        if(wallsLayer){
            wallsLayer = this.wallsGenerator.fixInnerWallsPatterns(
                wallsLayer,
                this.tileShortcutsMapper.mapTilesShortcuts(tilesKey, spotTilesShortcuts.p, null, '-inner-walls'),
                groundSpotConfig.width
            );
        }
        return {spotLayer, bordersLayer, wallsLayer, outerWallsLayer};
    }

    async generateSpotLayers(groundSpotConfig, tilesKey, spotTile, spotTilesShortcuts)
    {
        let spotLayer = this.spotLayersBuilder.createSpotLayerData(
            groundSpotConfig.width,
            groundSpotConfig.height,
            groundSpotConfig.markPercentage,
            spotTile,
            groundSpotConfig.applyCornersTiles,
            this.spotFillProcessor
        );
        if(groundSpotConfig.borderOuterWalls){
            let increasedLayer = this.spotFillProcessor.increaseLayerSize(
                spotLayer,
                groundSpotConfig.width,
                groundSpotConfig.height,
                sc.get(groundSpotConfig, 'borderOuterWallsIncreaseLayerSize', 4)
            );
            spotLayer = increasedLayer.layerData;
            groundSpotConfig.width = increasedLayer.width;
            groundSpotConfig.height = increasedLayer.height;
        }
        let bordersLayer = this.spotBordersAndCorners.applySplitBordersAndCorners(
            groundSpotConfig.applyCornersTiles,
            groundSpotConfig.width,
            groundSpotConfig.height,
            groundSpotConfig.splitBordersInLayers,
            spotLayer,
            spotTilesShortcuts
        );
        let pathLayerBuilders = {
            spotBorderAnalyzer: this.spotBorderAnalyzer,
            spotBordersAndCorners: this.spotBordersAndCorners,
            pathTile: this.pathTile,
            pathSize: this.pathSize
        };
        let pathLayerResult = this.spotLayersBuilder.createRandomPathLayer(
            groundSpotConfig,
            spotTile,
            bordersLayer,
            spotLayer,
            spotTilesShortcuts,
            pathLayerBuilders
        );
        bordersLayer = sc.get(pathLayerResult, 'bordersLayer', bordersLayer);
        spotLayer = sc.get(pathLayerResult, 'spotLayer', spotLayer);
        let wallsResult = await this.generateSpotWalls(
            groundSpotConfig,
            tilesKey,
            spotLayer,
            bordersLayer,
            spotTile,
            spotTilesShortcuts
        );
        spotLayer = wallsResult.spotLayer;
        bordersLayer = wallsResult.bordersLayer;
        if(!groundSpotConfig.splitBordersInLayers){
            spotLayer = bordersLayer;
        }
        return {
            spotLayer,
            bordersLayer,
            wallsLayer: wallsResult.wallsLayer,
            outerWallsLayer: wallsResult.outerWallsLayer,
            pathLayer: sc.get(pathLayerResult, 'pathLayer', false),
            variationsLayer: this.spotLayersBuilder.createVariationsLayer(
                groundSpotConfig,
                tilesKey,
                spotLayer,
                spotTile,
                this.elementsVariations
            )
        };
    }

    async generateSpotInstance(layerKey, groundSpotConfig, tilesKey, spotTile, spotTilesShortcuts, spotLayers, elementsData)
    {
        let generatedLayers = await this.generateSpotLayers(
            groundSpotConfig,
            tilesKey,
            spotTile,
            spotTilesShortcuts
        );
        spotLayers[layerKey] = generatedLayers.spotLayer;
        if(!groundSpotConfig.isElement){
            return false;
        }
        this.spotLayersBuilder.saveLayerElements(layerKey, groundSpotConfig, generatedLayers, elementsData);
        return true;
    }

    async generateSpots(generatedSpots, generateSpotsWithDepth, elementsData)
    {
        let spotsTerrains = {};
        for(let spotKey of Object.keys(this.groundSpots)){
            let groundSpotConfig = this.groundSpots[spotKey];
            let spotsQuantity = Number(sc.get(groundSpotConfig, 'quantity', 1));
            if(0 === spotsQuantity){
                Logger.warning('Ground spot was set with quantity 0.', groundSpotConfig);
                continue;
            }
            let addCollisions = !groundSpotConfig.walkable ? '-collisions' : '';
            let layerName = sc.get(groundSpotConfig, 'layerName', 'ground-spot-'+spotKey)+addCollisions;
            let tilesKey = sc.get(groundSpotConfig, 'tilesKey', spotKey);
            let spotTile = sc.get(groundSpotConfig, 'spotTile', this.groundTile);
            let spotTilesShortcuts = this.tileShortcutsMapper.mapTilesShortcuts(
                tilesKey,
                spotTile,
                this.fetchSpotPropertiesMapper(tilesKey, groundSpotConfig)
            );
            if(spotTilesShortcuts.p && spotTile !== spotTilesShortcuts.p){
                Logger.debug('Replaced spot tile "'+spotTile+'" by "'+spotTilesShortcuts.p+'".');
                spotTile = spotTilesShortcuts.p;
            }
            let originalWidth = groundSpotConfig.width;
            let originalHeight = groundSpotConfig.height;
            let spotLayers = {};
            for(let i = 0; i < spotsQuantity; i++){
                groundSpotConfig.width = originalWidth;
                groundSpotConfig.height = originalHeight;
                await this.generateSpotInstance(
                    layerName+'-s'+i, groundSpotConfig, tilesKey, spotTile, spotTilesShortcuts, spotLayers, elementsData
                );
            }
            groundSpotConfig.width = originalWidth;
            groundSpotConfig.height = originalHeight;
            groundSpotConfig.spotLayers = spotLayers;
            this.appendSpotTerrains(spotsTerrains, tilesKey, groundSpotConfig, spotTilesShortcuts, spotTile);
            if(sc.get(groundSpotConfig, 'depth', false) && 0 < Object.keys(spotLayers).length){
                generateSpotsWithDepth[spotKey] = groundSpotConfig;
            }
            generatedSpots[spotKey] = groundSpotConfig;
        }
        return Object.assign({generatedSpots, generateSpotsWithDepth, spotsTerrains}, elementsData);
    }

}

module.exports.SpotGenerator = SpotGenerator;
