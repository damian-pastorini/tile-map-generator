/**
 *
 * Reldens - SpotGenerator
 *
 */

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
        this.groundSpots = generator.groundSpots;
        this.groundSpotsPropertiesMappers = generator.groundSpotsPropertiesMappers;
        this.groundTile = generator.groundTile;
        this.pathTile = generator.pathTile;
        this.pathSize = generator.pathSize;
        this.elementsVariations = generator.elementsVariations;
    }

    async generateSpots(
        generatedSpots,
        generateSpotsWithDepth,
        layerElements,
        elementsQuantity,
        elementsFreeSpaceAround,
        elementsAllowPathsInFreeSpace,
        mapCenteredElements
    ){
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
            if(this.groundSpotsPropertiesMappers[tilesKey]) {
                this.groundSpotsPropertiesMappers[tilesKey].map();
            }
            let spotTilesShortcuts = this.tileShortcutsMapper.mapTilesShortcuts(
                tilesKey,
                spotTile,
                this.groundSpotsPropertiesMappers[tilesKey]
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
                let spotLayer = this.spotLayersBuilder.createSpotLayerData(
                    groundSpotConfig.width,
                    groundSpotConfig.height,
                    groundSpotConfig.markPercentage,
                    spotTile,
                    groundSpotConfig.applyCornersTiles,
                    this.spotFillProcessor
                );
                if(groundSpotConfig.borderOuterWalls){
                    let increasedLayer = this.spotFillProcessor.increaseLayerSize(spotLayer,
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
                let pathLayerResult = this.spotLayersBuilder.createRandomPathLayer(
                    groundSpotConfig,
                    spotTile,
                    bordersLayer,
                    spotLayer,
                    spotTilesShortcuts,
                    this.spotBorderAnalyzer,
                    this.spotBordersAndCorners,
                    this.pathTile,
                    this.pathSize
                );
                let pathLayer = pathLayerResult.pathLayer;
                bordersLayer = pathLayerResult ? pathLayerResult.bordersLayer : bordersLayer;
                spotLayer = pathLayerResult ? pathLayerResult.spotLayer : spotLayer;
                let wallsLayer = false;
                let outerWallsLayer = false;
                if(groundSpotConfig.applyCornersTiles){
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
                        let result = await this.wallsGenerator.createLayerOuterWalls(
                            bordersLayer,
                            tilesKey,
                            spotTilesShortcuts,
                            groundSpotConfig.width,
                            groundSpotConfig.height,
                            wallsLayer
                        );
                        outerWallsLayer = result.outerWallsLayer;
                        bordersLayer = result.bordersLayer;
                    }
                }
                if(wallsLayer){
                    wallsLayer = this.wallsGenerator.fixInnerWallsPatterns(
                        wallsLayer,
                        this.tileShortcutsMapper.mapTilesShortcuts(
                            tilesKey,
                            spotTilesShortcuts.p,
                            null,
                            '-inner-walls'
                        ),
                        groundSpotConfig.width,
                        groundSpotConfig.height
                    );
                }
                if(!groundSpotConfig.splitBordersInLayers){
                    spotLayer = bordersLayer;
                }
                let variationsLayer = this.spotLayersBuilder.createVariationsLayer(
                    groundSpotConfig,
                    tilesKey,
                    spotLayer,
                    spotTile,
                    this.elementsVariations
                );
                let layerKey = layerName+'-s'+i;
                spotLayers[layerKey] = spotLayer;
                if(groundSpotConfig.isElement){
                    let saveResult = this.spotLayersBuilder.saveLayerElements(
                        layerKey,
                        groundSpotConfig,
                        spotLayer,
                        variationsLayer,
                        pathLayer,
                        bordersLayer,
                        wallsLayer,
                        outerWallsLayer,
                        layerElements,
                        elementsQuantity,
                        elementsFreeSpaceAround,
                        elementsAllowPathsInFreeSpace,
                        mapCenteredElements
                    );
                    if(saveResult){
                        layerElements = saveResult.layerElements;
                        elementsQuantity = saveResult.elementsQuantity;
                        elementsFreeSpaceAround = saveResult.elementsFreeSpaceAround;
                        elementsAllowPathsInFreeSpace = saveResult.elementsAllowPathsInFreeSpace;
                        mapCenteredElements = saveResult.mapCenteredElements;
                    }
                }
            }
            groundSpotConfig.width = originalWidth;
            groundSpotConfig.height = originalHeight;
            groundSpotConfig.spotLayers = spotLayers;
            if(sc.get(groundSpotConfig, 'depth', false) && 0 < Object.keys(spotLayers).length){
                generateSpotsWithDepth[spotKey] = groundSpotConfig;
            }
            generatedSpots[spotKey] = groundSpotConfig;
        }
        return {
            generatedSpots,
            generateSpotsWithDepth,
            layerElements,
            elementsQuantity,
            elementsFreeSpaceAround,
            elementsAllowPathsInFreeSpace,
            mapCenteredElements
        };
    }

}

module.exports.SpotGenerator = SpotGenerator;
