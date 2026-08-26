/**
 *
 * Reldens - Tile Map Generator
 *
 */

const { OptionsValidator } = require('./validator/options-validator');
const { PathFinder } = require('./path-finder/path-finder');
const { JsonFormatter } = require('./map/json-formatter');
const { SpotTerrainsBuilder } = require('./map/spot-terrains-builder');
const { ElementsProvider } = require('./generator/elements-provider');
const { MapGridBuilder } = require('./generator/map-grid-builder');
const { PositionFinder } = require('./generator/position-finder');
const { PropertiesMapper } = require('./generator/properties-mapper');
const { MapDataMapper } = require('./map/data-mapper');
const { DebugHelper } = require('./generator/debug-helper');
const { MainPathGenerator } = require('./generator/main-path-generator');
const { PathRouter } = require('./generator/path-router');
const { PathTilesFinisher } = require('./generator/path-tiles-finisher');
const { PathConnector } = require('./generator/path-connector');
const { PathExpander } = require('./generator/path-expander');
const { SpotLayersBuilder } = require('./generator/spot-layers-builder');
const { SpotBorderAnalyzer } = require('./generator/spot-border-analyzer');
const { SpotFillProcessor } = require('./generator/spot-fill-processor');
const { SpotBordersAndCorners } = require('./generator/spot-borders-and-corners');
const { SpotPlacement } = require('./generator/spot-placement');
const { SpotGenerator } = require('./generator/spot-generator');
const { WallsGenerator } = require('./generator/walls-generator');
const { FileOperations } = require('./generator/file-operations');
const { ElementLayerName } = require('./map/element-layer-name');
const { BordersPatterns } = require('./patterns/borders-patterns');
const { TileShortcutsMapper } = require('./map/tile-shortcuts-mapper');
const { MapNaming } = require('./map/map-naming');
const { MapLayersComposer } = require('./generator/map-layers-composer');
const { MapBorderGenerator } = require('./generator/map-border-generator');
const { ElementsPlacer } = require('./generator/elements-placer');
const { ElementLayerWriter } = require('./generator/element-layer-writer');
const { CenteredElementsPlacer } = require('./generator/centered-elements-placer');
const { PlacementRejectResolver } = require('./generator/placement-reject-resolver');
const { TileVariationsApplier } = require('./map/tile-variations-applier');
const { TilePositionCalculator } = require('./generator/tile-position-calculator');
const { ReturnPointWriter } = require('./generator/return-point-writer');
const { GeometryCalculator } = require('./map/geometry-calculator');
const { LayerDataFactory } = require('./map/layer-data-factory');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class RandomMapGenerator
{

    constructor(props)
    {
        this.optionsValidator = new OptionsValidator();
        this.pathFinder = new PathFinder();
        this.propertiesMapper = new PropertiesMapper();
        this.elementLayerName = new ElementLayerName();
        this.mappedMapDataFromProvider = {};
        this.elementsProvider = null;
        this.generatedFloorData = {};
        this.mapCustomProperties = [];
        this.currentDate = '';
        this.defaultMapName = '';
        this.mapType = 'map';
        this.mapVersion = '1.10';
        this.mapSizeFreeSpaceSidesMultiplier = 1;
        this.requiredForBothSidesDuplicator = 2;
        this.isReady = false;
        this.includeSpotsAsTerrains = true;
        this.spotsTerrains = {};
        this.tilesShortcuts = {};
        this.groundVariationsLayerData = [];
        this.bordersPatterns = null;
        this.geometryCalculator = null;
        this.layerDataFactory = null;
        this.tileVariationsApplier = null;
        this.tilePositionCalculator = null;
        this.returnPointWriter = null;
        this.tileShortcutsMapper = null;
        this.mapNaming = null;
        this.mapLayersComposer = null;
        this.mapBorderGenerator = null;
        this.elementsPlacer = null;
        this.elementLayerWriter = null;
        this.centeredElementsPlacer = null;
        this.placementRejectResolver = null;
        this.placedElementsJournal = [];
        this.placeRejectResolver = 'autoGrow';
        this.debugHelper = null;
        this.wallsGenerator = null;
        this.mapGridBuilder = null;
        this.spotLayersBuilder = null;
        this.spotBorderAnalyzer = null;
        this.spotFillProcessor = null;
        this.spotBordersAndCorners = null;
        this.spotPlacement = null;
        this.spotGenerator = null;
        this.positionFinder = null;
        this.mainPathGenerator = null;
        this.pathRouter = null;
        this.pathTilesFinisher = null;
        this.pathExpander = null;
        this.pathConnector = null;
        this.resetInstance(props);
    }

    resetInstance(props)
    {
        this.currentDate = sc.getDateForFileName();
        this.defaultMapName = 'random-map-' + this.currentDate;
        this.isReady = false;
        this.tileShortcutsMapper = new TileShortcutsMapper(this);
        this.mapNaming = new MapNaming();
        if(props && 0 < Object.keys(props).length){
            this.setOptions(props);
            this.isReady = this.validate();
        }
        this.bordersPatterns = new BordersPatterns();
        this.geometryCalculator = new GeometryCalculator();
        this.layerDataFactory = new LayerDataFactory();
        this.tileVariationsApplier = new TileVariationsApplier();
        this.tilePositionCalculator = new TilePositionCalculator(this);
        this.returnPointWriter = new ReturnPointWriter();
        this.mapLayersComposer = new MapLayersComposer(this);
        this.mapBorderGenerator = new MapBorderGenerator(this);
        this.elementsPlacer = new ElementsPlacer(this);
        this.elementLayerWriter = new ElementLayerWriter(this);
        this.centeredElementsPlacer = new CenteredElementsPlacer(this);
        this.placementRejectResolver = new PlacementRejectResolver(this);
        this.debugHelper = new DebugHelper(this);
        this.wallsGenerator = new WallsGenerator(this);
        this.mapGridBuilder = new MapGridBuilder(this);
        this.spotLayersBuilder = new SpotLayersBuilder(
            this.geometryCalculator,
            this.tileVariationsApplier,
            this.layerDataFactory
        );
        this.spotBorderAnalyzer = new SpotBorderAnalyzer(this.layerDataFactory);
        this.spotFillProcessor = new SpotFillProcessor(
            this.layerDataFactory,
            this.geometryCalculator,
            this.mapLayersComposer
        );
        this.spotBordersAndCorners = new SpotBordersAndCorners(this.geometryCalculator, this.bordersPatterns);
        this.spotPlacement = new SpotPlacement(this.geometryCalculator);
        this.spotGenerator = new SpotGenerator(
            this.spotLayersBuilder,
            this.spotFillProcessor,
            this.spotBordersAndCorners,
            this.spotBorderAnalyzer,
            this.wallsGenerator,
            this.tileShortcutsMapper,
            this
        );
        this.positionFinder = new PositionFinder(this);
        this.mainPathGenerator = new MainPathGenerator(
            this.tilePositionCalculator,
            this.returnPointWriter,
            this.layerDataFactory,
            this.mapGridBuilder
        );
        this.pathRouter = new PathRouter(this.pathFinder, this.geometryCalculator);
        this.pathTilesFinisher = new PathTilesFinisher(
            this.bordersPatterns,
            this.layerDataFactory,
            this.mapGridBuilder,
            this.wallsGenerator,
            this.geometryCalculator,
            this.tilePositionCalculator
        );
        this.pathExpander = new PathExpander(this.layerDataFactory, this.mapGridBuilder);
        this.pathConnector = new PathConnector(
            this.pathRouter,
            this.mainPathGenerator,
            this.pathTilesFinisher,
            this.spotBordersAndCorners,
            this.layerDataFactory,
            this.pathExpander,
            this
        );
    }

    setOptions(options)
    {
        this.assignBaseOptions(options);
        this.assignPathAndBorderOptions(options);
        this.propertiesMapper.map(this.surroundingTiles, this.corners);
        this.tilesShortcuts = this.tileShortcutsMapper.mapTilesShortcuts('path', this.pathTile, this.propertiesMapper);
        this.assignRemainingOptions(options);
        this.initializeRuntimeState();
    }

    assignBaseOptions(options)
    {
        this.tileSize = sc.get(options, 'tileSize', false);
        this.tileSheetPath = sc.get(options, 'tileSheetPath', false);
        this.tileSheetName = sc.get(options, 'tileSheetName', false);
        this.imageHeight = sc.get(options, 'imageHeight', false);
        this.imageWidth = sc.get(options, 'imageWidth', false);
        this.tileCount = sc.get(options, 'tileCount', false);
        this.columns = sc.get(options, 'columns', false);
        this.layerElements = sc.get(options, 'layerElements', null);
        this.elementsQuantity = sc.get(options, 'elementsQuantity', null);
        this.elementsFreeSpaceAround = sc.get(options, 'elementsFreeSpaceAround', {});
        this.minimumElementsFreeSpaceAround = sc.get(options, 'minimumElementsFreeSpaceAround', 0);
        this.elementsAllowPathsInFreeSpace = sc.get(options, 'elementsAllowPathsInFreeSpace', {});
        this.defaultElementsAllowPathsInFreeSpace = sc.get(options, 'defaultElementsAllowPathsInFreeSpace', true);
        this.mapCenteredElements = sc.get(options, 'mapCenteredElements', {});
        this.debugPathsGrid = sc.get(options, 'debugPathsGrid', false);
        this.shouldDebugAdjacentSpots = sc.get(options, 'shouldDebugAdjacentSpots', false);
        this.rootFolder = sc.get(options, 'rootFolder', __dirname);
        this.generatedFolder = sc.get(options, 'generatedFolder', FileHandler.joinPaths(this.rootFolder, 'generated'));
        let mapName = sc.get(options, 'mapName', this.defaultMapName);
        this.mapName = this.mapNaming.stripJsonExtension(mapName);
        let mapFileName = sc.get(options, 'mapFileName', this.mapName);
        mapFileName = this.mapNaming.ensureJsonExtension(mapFileName);
        this.mapFileName = mapFileName;
        this.mapFileFullPath = FileHandler.joinPaths(this.generatedFolder, this.mapFileName);
        this.mapType = sc.get(options, 'mapType', 'map');
        this.mapVersion = sc.get(options, 'mapVersion', '1.10');
        this.mapSize = sc.get(options, 'mapSize', {mapWidth: 0, mapHeight: 0});
        this.margin = sc.get(options, 'margin', 0);
        this.spacing = sc.get(options, 'spacing', 0);
        this.tiles = sc.get(options, 'tiles', []);
        this.groundTile = sc.get(options, 'groundTile', 0);
        this.groundTiles = sc.get(options, 'groundTiles', []);
        if(0 === this.groundTile && 0 < this.groundTiles.length){
            this.groundTile = this.groundTiles[Math.floor(Math.random() * this.groundTiles.length)];
        }
    }

    assignPathAndBorderOptions(options)
    {
        this.borderTile = sc.get(options, 'borderTile', 0);
        this.bordersTiles = sc.get(options, 'bordersTiles', {
            'top': this.borderTile,
            'right': this.borderTile,
            'bottom': this.borderTile,
            'left': this.borderTile
        });
        this.borderCornersTiles = sc.get(options, 'borderCornersTiles', {});
        this.generateElementsPath = sc.get(options, 'generateElementsPath', true);
        this.mainPathSize = sc.get(options, 'mainPathSize', 0);
        this.pathSize = sc.get(options, 'pathSize', 1);
        this.allowPlacePathOverElementsFreeArea = sc.get(options, 'allowPlacePathOverElementsFreeArea', false);
        this.blockMapBorder = sc.get(options, 'blockMapBorder', false);
        this.borderLayer = false;
        this.isBorderWalkable = sc.get(options, 'isBorderWalkable', false);
        this.minimumDistanceFromBorders = sc.get(options, 'minimumDistanceFromBorders', 1);
        this.placeElementsCloserToBorders = sc.get(options, 'placeElementsCloserToBorders', false);
        this.entryPosition = sc.get(options, 'entryPosition', '');
        this.entryPositionFrom = sc.get(options, 'entryPositionFrom', '');
        this.entryPositionSize = sc.get(options, 'entryPositionSize', 0);
        this.sortPositionsRelativeToTheMapCenter = sc.get(options, 'sortPositionsRelativeToTheMapCenter', true);
        this.freeSpaceTilesQuantity = sc.get(options, 'freeSpaceTilesQuantity', 0);
        this.freeSpaceMultiplier = sc.get(options, 'freeSpaceMultiplier', 1);
        this.freeTilesMultiplier = sc.get(options, 'freeTilesMultiplier', 1);
        this.mapSizeFreeSpaceSidesMultiplier = sc.get(options, 'mapSizeFreeSpaceSidesMultiplier', 1);
        this.variableTilesPercentage = sc.get(options, 'variableTilesPercentage', 0);
        this.groundSpots = sc.get(options, 'groundSpots', {});
        this.groundSpotsPropertiesMappers = sc.get(options, 'groundSpotsPropertiesMappers', {});
        this.factor = sc.get(options, 'factor', 1);
        this.elementsVariations = sc.get(options, 'elementsVariations', {});
        this.optimizedMapFirstTileset = sc.get(options, 'optimizedMapFirstTileset', null);
        this.pathTile = sc.get(options, 'pathTile', 0);
        this.collisionLayersForPaths = sc.get(options, 'collisionLayersForPaths', []);
        this.randomGroundTiles = sc.get(options, 'randomGroundTiles', []);
        this.surroundingTiles = sc.get(options, 'surroundingTiles', {});
        this.corners = sc.get(options, 'corners', {});
    }

    assignRemainingOptions(options)
    {
        this.mapBackgroundColor = sc.get(options, 'mapBackgroundColor', '#000000');
        this.mapCompressionLevel = sc.get(options, 'mapCompressionLevel', 0);
        this.applySurroundingPathTiles = sc.get(options, 'applySurroundingPathTiles', true);
        this.includeSpotsAsTerrains = sc.get(options, 'includeSpotsAsTerrains', true);
        this.spotsTerrains = {};
        this.splitBordersInLayers = sc.get(options, 'splitBordersInLayers', false);
        this.applyPathsInnerWalls = sc.get(options, 'applyPathsInnerWalls', false);
        this.pathsInnerWallsTilesKey = sc.get(options, 'pathsInnerWallsTilesKey', 'path');
        this.applyPathsOuterWalls = sc.get(options, 'applyPathsOuterWalls', false);
        this.pathsOuterWallsTilesKey = sc.get(options, 'pathsOuterWallsTilesKey', 'path');
        this.cleanPathBorderTilesFromElements = sc.get(options, 'cleanPathBorderTilesFromElements', false);
        this.splitBordersLayerSuffix = sc.get(options, 'splitBordersLayerSuffix', '');
        this.removeGroundLayer = sc.get(options, 'removeGroundLayer', false);
        this.applyGroundAsPathTilePostProcess = sc.get(options, 'applyGroundAsPathTilePostProcess', false);
        this.writeCroppedElementsFiles = sc.get(options, 'writeCroppedElementsFiles', false);
        this.orderElementsBySize = sc.get(options, 'orderElementsBySize', true);
        this.randomizeQuantities = sc.get(options, 'randomizeQuantities', false);
        this.associatedMapsConfig = sc.get(options, 'associatedMapsConfig', {});
        this.placeElementsOrder = sc.get(options, 'placeElementsOrder', 'random');
        this.placeRejectResolver = sc.get(options, 'placeRejectResolver', 'autoGrow');
        this.generatedMainPathIndexes = sc.get(options, 'generatedMainPathIndexes', []);
        this.generatedMainPathIndexesBorder = sc.get(options, 'generatedMainPathIndexesBorder', []);
        this.previousMainPath = sc.get(options, 'previousMainPath', []);
        this.removeOptimizedMapFilesAfterGeneration = sc.get(options, 'removeOptimizedMapFilesAfterGeneration', true);
        this.previousFloorData = sc.get(options, 'previousFloorData', {});
        this.autoMergeLayersByKeys = sc.get(options, 'autoMergeLayersByKeys', []);
    }

    initializeRuntimeState()
    {
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapGrid = [];
        this.groundLayerData = [];
        this.pathLayerData = [];
        this.splitBorderLayer = [];
        this.pathLayerProperties = [];
        this.mainPathStart = false;
        this.mainPathStartBorder = false;
        this.additionalLayers = [];
        this.staticLayers = [];
        this.groundVariationsLayerData = [];
        this.pathInnerWallsLayer = [];
        this.pathOuterWallsLayer = [];
        this.generatedChangePoints = {};
        this.generatedReturnPoints = {};
        this.hasAssociatedMap = false;
        this.debugLayerData = false;
        this.temporalBlockedPositionsToAvoidElements = [];
        this.temporalBlockedPositionsToAvoidElementsList = [];
        this.generatedSpots = {};
        this.generateSpotsWithDepth = {};
        this.centerPlacedElements = [];
        this.placedElementsJournal = [];
    }

    createTiledMapObject(layers, width = 0, height = 0)
    {
        width = 0 === width ? this.mapWidth : width;
        height = 0 === height ? this.mapHeight : height;
        return {
            type: this.mapType,
            version: this.mapVersion,
            backgroundcolor: this.mapBackgroundColor,
            compressionlevel: this.mapCompressionLevel,
            infinite: false,
            orientation: 'orthogonal',
            renderorder: 'right-down',
            tileheight: this.tileSize,
            tilewidth: this.tileSize,
            width,
            height,
            nextobjectid: 1,
            nextlayerid: layers.length + 1,
            properties: this.mapCustomProperties,
            tilesets: [this.createTiledTilesetObject()],
            layers
        };
    }

    createTiledTilesetObject()
    {
        let tileset = {
            columns: this.columns,
            firstgid: 1,
            image: this.tileSheetName,
            imageheight: this.imageHeight,
            imagewidth: this.imageWidth,
            margin: this.margin,
            name: this.mapName,
            spacing: this.spacing,
            tilecount: this.tileCount,
            tileheight: this.tileSize,
            tilewidth: this.tileSize,
            tiles: this.tiles,
        };
        if(!this.includeSpotsAsTerrains){
            return tileset;
        }
        let wangsets = SpotTerrainsBuilder.build(this.spotsTerrains, tileset.tilecount, tileset.firstgid);
        if(0 === wangsets.length){
            return tileset;
        }
        tileset.wangsets = wangsets;
        return tileset;
    }

    validate()
    {
        return this.optionsValidator.validate(this);
    }

    async fromAssociation(props)
    {
        return await this.fromElementsProvider(props);
    }

    async fromElementsProvider(props)
    {
        let elementsProviderData = sc.deepJsonClone(props);
        let mapName = props.mapName || 'random-map-' + sc.getDateForFileName();
        elementsProviderData.mapFileName = mapName + '-elements';
        elementsProviderData.writeCroppedElementsFiles = props.writeCroppedElementsFiles;
        this.elementsProvider = new ElementsProvider(elementsProviderData);
        await this.elementsProvider.splitElements();
        this.mappedMapDataFromProvider = MapDataMapper.fromProvider(props, mapName, this.elementsProvider);
        this.resetInstance(this.mappedMapDataFromProvider);
        return this;
    }

    async generate()
    {
        this.isReady = this.validate();
        if(!this.isReady){
            return false;
        }
        FileHandler.createFolder(this.generatedFolder);
        // spots must be generated first because these can generate elements that should be considered on the map size
        let spotsResult = await this.spotGenerator.generateSpots(
            this.generatedSpots,
            this.generateSpotsWithDepth,
            {
                layerElements: this.layerElements,
                elementsQuantity: this.elementsQuantity,
                elementsFreeSpaceAround: this.elementsFreeSpaceAround,
                elementsAllowPathsInFreeSpace: this.elementsAllowPathsInFreeSpace,
                mapCenteredElements: this.mapCenteredElements
            }
        );
        if(spotsResult){
            Object.assign(this, spotsResult);
        }
        let gridResult = this.mapGridBuilder.generateEmptyMap(this.mapSize, this.groundTile);
        this.mapGrid = gridResult.mapGrid;
        this.groundLayerData = gridResult.groundLayerData;
        this.mapWidth = gridResult.mapWidth;
        this.mapHeight = gridResult.mapHeight;
        this.mapBorderGenerator.populateCollisionsMapBorder();
        this.pathLayerData = this.layerDataFactory.createEmptyLayerData(this.mapWidth, this.mapHeight);
        this.initializeMainPath();
        await this.elementsPlacer.placeElements();
        // the grid to connect paths is created after the additional layers are created on the placeElements method
        await this.executePathsConnection();
        // apply variations after all the elements are displayed in the current map:
        this.applyVariations();
        let layers = this.mapLayersComposer.generateLayersList();
        await this.debugHelper.writeDebugPathFinderFile(layers, 'test-path-finding-grid-', this.debugLayerData);
        // map template:
        let map = this.createTiledMapObject(layers);
        let result = FileHandler.copyFile(
            FileHandler.joinPaths(this.rootFolder, this.tileSheetPath),
            FileHandler.joinPaths(this.generatedFolder, this.tileSheetName)
        );
        if(!result){
            Logger.error(
                'Could not copy tile sheet to generated folder.',
                {
                    tileSheetPath: this.tileSheetPath,
                    generatedFolder: this.generatedFolder,
                    tileSheetName: this.tileSheetName
                }
            );
            return false;
        }
        // save the map in a JSON file:
        FileHandler.writeFile(this.mapFileFullPath, JsonFormatter.mapToJSON(map));
        FileOperations.cleanAutoGeneratedProcessMapFiles(
            this.removeOptimizedMapFilesAfterGeneration,
            this.factor,
            this.mapFileFullPath,
            this.mapName,
            this.generatedFolder
        );
        Logger.info('Map file successfully generated: ' + this.mapName);
        // after the main map was created, we can create the associated maps:
        return sc.deepJsonClone(map);
    }

    initializeMainPath()
    {
        let pathResult = this.mainPathGenerator.placeMainPath(
            this.pathLayerData,
            this.mapGrid,
            this.mapWidth,
            this.mapHeight,
            this.generatedMainPathIndexes,
            this.generatedMainPathIndexesBorder,
            this.generatedReturnPoints,
            this.pathLayerProperties,
            this.hasAssociatedMap,
            this.mainPathStart,
            this.previousMainPath,
            this.mainPathSize,
            this.isBorderWalkable,
            this.blockMapBorder,
            this.mapName,
            this.pathTile
        );
        this.pathLayerData = pathResult.pathLayerData;
        this.generatedMainPathIndexes = pathResult.generatedMainPathIndexes;
        this.generatedMainPathIndexesBorder = pathResult.generatedMainPathIndexesBorder;
        this.generatedReturnPoints = pathResult.generatedReturnPoints;
        this.pathLayerProperties = pathResult.pathLayerProperties;
        this.hasAssociatedMap = pathResult.hasAssociatedMap;
        this.mainPathStart = pathResult.mainPathStart;
    }

    async executePathsConnection()
    {
        let pathResult = await this.pathConnector.connectPaths(
            this.mapWidth,
            this.mapHeight,
            this.temporalBlockedPositionsToAvoidElements,
            this.additionalLayers,
            this.mapGrid,
            this.pathLayerData,
            this.splitBorderLayer,
            this.mainPathStart,
            this.pathInnerWallsLayer,
            this.pathOuterWallsLayer,
            this.tilesShortcuts
        );
        if(!pathResult){
            return;
        }
        this.pathLayerData = pathResult.pathLayerData;
        this.debugLayerData = pathResult.debugLayerData;
        this.splitBorderLayer = pathResult.splitBorderLayer;
        this.pathInnerWallsLayer = pathResult.pathInnerWallsLayer;
        this.pathOuterWallsLayer = pathResult.pathOuterWallsLayer;
    }

    addMapProperty(name, type, value)
    {
        this.mapCustomProperties.push({name, type, value});
    }

    fetchMapProperty(name)
    {
        for(let property of this.mapCustomProperties){
            if(property.name === name){
                return property;
            }
        }
        return false;
    }

    generateLayerWithData(layerName, layerData, width = 0, height = 0)
    {
        width = 0 === width ? this.mapWidth : width;
        height = 0 === height ? this.mapHeight : height;
        if(layerData.some(tile => null === tile)){
            Logger.error('NULL tiles detected in layer "'+layerName+'", those will be replaced by 0 values.');
        }
        return {
            data: layerData.map(tile => tile ?? 0),
            width,
            height,
            name: layerName,
            type: 'tilelayer',
            visible: true,
            opacity: 1,
            x: 0,
            y: 0
        };
    }

    applyVariations()
    {
        if(0 === this.randomGroundTiles.length){
            return;
        }
        let totalTiles = this.pathLayerData.filter(tile => 0 === tile).length;
        this.groundVariationsLayerData = this.tileVariationsApplier.applyTilesVariations(
            this.layerDataFactory.createEmptyLayerData(this.mapWidth, this.mapHeight),
            this.mapWidth,
            this.mapHeight,
            totalTiles,
            this.randomGroundTiles,
            this.variableTilesPercentage,
            this.pathLayerData
        );
    }

}

module.exports.RandomMapGenerator = RandomMapGenerator;
