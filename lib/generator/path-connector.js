/**
 *
 * Reldens - Tile Map Generator - PathConnector
 *
 */

const { GeometryCalculator } = require('../map/geometry-calculator');

class PathConnector
{

    constructor(
        pathRouter,
        mainPathGenerator,
        pathTilesFinisher,
        spotBordersAndCorners,
        layerDataFactory,
        pathExpander,
        generator
    )
    {
        this.pathRouter = pathRouter;
        this.mainPathGenerator = mainPathGenerator;
        this.pathExpander = pathExpander;
        this.pathTilesFinisher = pathTilesFinisher;
        this.spotBordersAndCorners = spotBordersAndCorners;
        this.layerDataFactory = layerDataFactory;
        this.geometryCalculator = new GeometryCalculator();
        this.generateElementsPath = generator.generateElementsPath;
        this.mainPathSize = generator.mainPathSize;
        this.previousMainPath = generator.previousMainPath;
        this.pathSize = generator.pathSize;
        this.isBorderWalkable = generator.isBorderWalkable;
        this.pathTile = generator.pathTile;
        this.blockMapBorder = generator.blockMapBorder;
        this.sortPositionsRelativeToTheMapCenter = generator.sortPositionsRelativeToTheMapCenter;
        this.applySurroundingPathTiles = generator.applySurroundingPathTiles;
        this.splitBordersInLayers = generator.splitBordersInLayers;
        this.applyPathsInnerWalls = generator.applyPathsInnerWalls;
        this.pathsInnerWallsTilesKey = generator.pathsInnerWallsTilesKey;
        this.applyPathsOuterWalls = generator.applyPathsOuterWalls;
        this.pathsOuterWallsTilesKey = generator.pathsOuterWallsTilesKey;
        this.cleanPathBorderTilesFromElements = generator.cleanPathBorderTilesFromElements;
        this.allowPlacePathOverElementsFreeArea = generator.allowPlacePathOverElementsFreeArea;
        this.collisionLayersForPaths = generator.collisionLayersForPaths;
        this.mapName = generator.mapName;
        this.pathFinder = generator.pathFinder;
        this.mapGridBuilder = generator.mapGridBuilder;
        this.bordersPatterns = generator.bordersPatterns;
        this.tileShortcutsMapper = generator.tileShortcutsMapper;
        this.tilePositionCalculator = generator.tilePositionCalculator;
        this.wallsGenerator = generator.wallsGenerator;
    }

    async connectPaths(
        mapWidth,
        mapHeight,
        temporalBlockedPositionsToAvoidElements,
        additionalLayers,
        mapGrid,
        pathLayerData,
        splitBorderLayer,
        mainPathStart,
        pathInnerWallsLayer,
        pathOuterWallsLayer,
        tilesShortcuts
    ){
        if(!this.generateElementsPath){
            return false;
        }
        let gridResult = this.mapGridBuilder.createPathfindingGrid(
            this.pathFinder,
            mapWidth,
            mapHeight,
            temporalBlockedPositionsToAvoidElements,
            additionalLayers,
            this.collisionLayersForPaths,
            mapGrid
        );
        let grid = gridResult.grid;
        let debugLayerData = gridResult.debugLayerData;
        let allPathsPoints = [];
        let pathLayers = additionalLayers.filter(layer => 'path' === layer.name);
        if(mainPathStart){
            grid.setWalkableAt(mainPathStart.x, mainPathStart.y, true);
        }
        for(let layer of pathLayers){
            let pathTilePositions = this.pathRouter.sortPositionsByDistanceFromCenter(
                this.pathRouter.findPathTilePositions(layer.data, mapWidth, mapHeight, this.pathTile),
                mapWidth,
                mapHeight,
                this.sortPositionsRelativeToTheMapCenter
            );
            for(let i = 0; i < pathTilePositions.length; i++){
                let pathTilePosition = pathTilePositions[i];
                if(this.tilePositionCalculator.isBorder(pathTilePosition)){
                    continue;
                }
                grid.setWalkableAt(pathTilePosition.x, pathTilePosition.y, true);
                let endPathTilePosition = this.pathRouter.fetchEndPathTilePosition(
                    pathTilePositions,
                    pathTilePosition,
                    mainPathStart
                );
                let path = this.pathRouter.findPathToPoints(
                    pathTilePosition,
                    endPathTilePosition,
                    pathTilePositions,
                    grid
                );
                if(0 === path.length){
                    continue;
                }
                for(let point of path){
                    grid.setWalkableAt(point[0], point[1], true);
                    let pointIndex = this.layerDataFactory.tileIndex(point[1], point[0], mapWidth);
                    pathLayerData[pointIndex] = this.pathTile;
                    allPathsPoints.push(point);
                }
            }
        }
        if(1 < this.pathSize){
            pathLayerData = this.pathExpander.expand(
                pathLayerData,
                mapWidth,
                mapHeight,
                additionalLayers,
                mapGrid,
                this.pathSize,
                this.pathTile
            );
        }
        for(let point of allPathsPoints){
            mapGrid[point[1]][point[0]] = false;
        }
        if(!this.applySurroundingPathTiles){
            this.mainPathGenerator.markPathTilesAsUnavailable(
                splitBorderLayer,
                pathLayerData,
                mapGrid,
                mapWidth,
                mapHeight,
                this.splitBordersInLayers
            );
            return {pathLayerData, debugLayerData, splitBorderLayer, pathInnerWallsLayer, pathOuterWallsLayer};
        }
        splitBorderLayer = this.spotBordersAndCorners.applySplitBordersAndCorners(
            this.applySurroundingPathTiles,
            mapWidth,
            mapHeight,
            this.splitBordersInLayers,
            pathLayerData,
            tilesShortcuts
        );
        splitBorderLayer = this.pathTilesFinisher.applyCleanPathBorderTiles(
            splitBorderLayer,
            mapWidth,
            mapHeight,
            additionalLayers,
            this.cleanPathBorderTilesFromElements,
            this.pathTile
        );
        splitBorderLayer = this.spotBordersAndCorners.applyBorderEndTiles(
            splitBorderLayer,
            this.pathTilesFinisher.fetchPathBorderEndTiles(splitBorderLayer, mapWidth),
            splitBorderLayer,
            tilesShortcuts,
            mapWidth,
            mapHeight
        );
        pathInnerWallsLayer = this.pathTilesFinisher.createPathInnerWalls(
            splitBorderLayer,
            mapWidth,
            mapHeight,
            tilesShortcuts,
            this.applyPathsInnerWalls,
            this.pathsInnerWallsTilesKey
        );
        let outerWallsResult = await this.pathTilesFinisher.createPathOuterWalls(
            splitBorderLayer,
            mapWidth,
            mapHeight,
            pathInnerWallsLayer,
            tilesShortcuts,
            this.applyPathsOuterWalls,
            this.pathsOuterWallsTilesKey
        );
        if(outerWallsResult?.outerWallsLayer && outerWallsResult?.bordersLayer){
            pathOuterWallsLayer = outerWallsResult.outerWallsLayer;
            splitBorderLayer = outerWallsResult.bordersLayer;
            pathInnerWallsLayer = this.wallsGenerator.fixInnerWallsPatterns(
                pathInnerWallsLayer,
                this.tileShortcutsMapper.mapTilesShortcuts(
                    this.pathsInnerWallsTilesKey,
                    tilesShortcuts.p,
                    null,
                    '-inner-walls'
                ),
                mapWidth
            );
        }
        splitBorderLayer = this.pathTilesFinisher.cleanUpMapBorders(
            splitBorderLayer,
            tilesShortcuts,
            mapWidth,
            mapHeight
        );
        this.mainPathGenerator.markPathTilesAsUnavailable(
            splitBorderLayer,
            pathLayerData,
            mapGrid,
            mapWidth,
            mapHeight,
            this.splitBordersInLayers
        );
        pathLayerData = this.pathTilesFinisher.fillPathSingleTiles(pathLayerData, this.pathTile, mapWidth, mapHeight);
        if(!this.splitBordersInLayers){
            pathLayerData = splitBorderLayer;
        }
        return {pathLayerData, debugLayerData, splitBorderLayer, pathInnerWallsLayer, pathOuterWallsLayer};
    }

}

module.exports.PathConnector = PathConnector;
