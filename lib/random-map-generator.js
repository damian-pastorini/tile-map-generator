/**
 *
 * Reldens - Tile Map Generator
 *
 */

const { OptionsValidator } = require('./validator/options-validator');
const { PathFinder } = require('./path-finder/path-finder');
const { JsonFormatter } = require('./map/json-formatter');
const { ElementsProvider } = require('./generator/elements-provider');
const { MapGridBuilder } = require('./generator/map-grid-builder');
const { PropertiesMapper } = require('./generator/properties-mapper');
const { MapDataMapper } = require('./map/data-mapper');
const { TilesShortcuts } = require('./map/tiles-shortcuts');
const { WallsMapper } = require('./map/walls-mapper');
const { BordersAndCornersTiles } = require('./patterns/borders-and-corners-tiles');
const { InnerWalls } = require('./patterns/inner-walls');
const { OuterWallsMerge } = require('./patterns/outer-walls-merge');
const { OuterWalls } = require('./patterns/outer-walls');
const { Corners } = require('./patterns/corners');
const { DebugHelper } = require('./generator/debug-helper');
const { PathConnector } = require('./generator/path-connector');
const { SpotGenerator } = require('./generator/spot-generator');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class RandomMapGenerator
{

    constructor(props)
    {
        this.optionsValidator = new OptionsValidator();
        this.pathFinder = new PathFinder();
        this.mapGridBuilder = new MapGridBuilder();
        this.propertiesMapper = new PropertiesMapper();
        this.mappedMapDataFromProvider = {};
        this.elementsProvider = null;
        this.generatedFloorData = {};
        this.mapCustomProperties = [];
        this.resetInstance(props);
    }

    resetInstance(props)
    {
        this.currentDate = sc.getTime();
        this.defaultMapName = 'random-map-' + this.currentDate;
        this.isReady = false;
        if(props && 0 < Object.keys(props).length){
            this.setOptions(props);
            this.isReady = this.validate();
        }
        this.debugHelper = new DebugHelper(this);
        this.spotGenerator = new SpotGenerator(this);
        this.pathConnector = new PathConnector(this);
    }

    setOptions(options)
    {
        // @NOTE: when adding a new property here, remember to include it in the ElementsProvider and the MapDataMapper.
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
        this.generatedFolder = sc.get(
            options,
            'generatedFolder',
            FileHandler.joinPaths(this.rootFolder, 'generated')
        );
        let mapName = sc.get(options, 'mapName', this.defaultMapName);
        this.mapName = mapName.replace('.json', '');
        let mapFileName = sc.get(options, 'mapFileName', this.mapName);
        if(-1 === mapFileName.indexOf('.json')){
            mapFileName += '.json';
        }
        this.mapFileName = mapFileName;
        this.mapFileFullPath = FileHandler.joinPaths(this.generatedFolder, this.mapFileName);
        this.mapSize = sc.get(options, 'mapSize', {mapWidth: 0, mapHeight: 0});
        this.margin = sc.get(options, 'margin', 0);
        this.spacing = sc.get(options, 'spacing', 0);
        this.tiles = sc.get(options, 'tiles', []);
        this.groundTile = sc.get(options, 'groundTile', 0);
        this.groundTiles = sc.get(options, 'groundTiles', []);
        if(0 === this.groundTile && 0 < this.groundTiles.length){
            this.groundTile = this.groundTiles[Math.floor(Math.random() * this.groundTiles.length)];
        }
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
        this.freeSpaceMultiplier = sc.get(options, 'freeSpaceTilesQuantity', 1);
        this.freeTilesMultiplier = sc.get(options, 'freeTilesMultiplier', 1);
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
        this.populatePropertiesMapper(this.propertiesMapper, this.surroundingTiles, this.corners);
        this.tilesShortcuts = this.mapTilesShortcuts('path', this.pathTile, this.propertiesMapper);
        this.mapBackgroundColor = sc.get(options, 'mapBackgroundColor', '#000000');
        this.mapCompressionLevel = sc.get(options, 'mapCompressionLevel', 0);
        this.applySurroundingPathTiles = sc.get(options, 'applySurroundingPathTiles', true);
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
        this.generatedMainPathIndexes = sc.get(options, 'generatedMainPathIndexes', []);
        this.generatedMainPathIndexesBorder = sc.get(options, 'generatedMainPathIndexesBorder', []);
        this.previousMainPath = sc.get(options, 'previousMainPath', []);
        this.removeOptimizedMapFilesAfterGeneration = sc.get(options, 'removeOptimizedMapFilesAfterGeneration', true);
        this.previousFloorData = sc.get(options, 'previousFloorData', {});
        this.autoMergeLayersByKeys = sc.get(options, 'autoMergeLayersByKeys', []);
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
        let mapName = props.mapName || 'random-map-' + sc.getTime();
        elementsProviderData.mapName = mapName + '-elements';
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
        // spots must be generated first because these can generate elements that should be considered on the map size
        let spotsResult = await this.spotGenerator.generateSpots(
            this.generatedSpots,
            this.generateSpotsWithDepth,
            this.layerElements,
            this.elementsQuantity,
            this.elementsFreeSpaceAround,
            this.elementsAllowPathsInFreeSpace,
            this.mapCenteredElements
        );
        if(spotsResult){
            Object.assign(this, spotsResult);
        }
        let gridResult = this.mapGridBuilder.generateEmptyMap(
            this.mapSize,
            this.groundTile,
            this.calculateMapSizeWithFreeSpace.bind(this)
        );
        this.mapGrid = gridResult.mapGrid;
        this.groundLayerData = gridResult.groundLayerData;
        this.mapWidth = gridResult.mapWidth;
        this.mapHeight = gridResult.mapHeight;
        this.populateCollisionsMapBorder();
        this.pathLayerData = Array(this.mapWidth * this.mapHeight).fill(0);
        this.initializeMainPath();
        await this.placeElements();
        // the grid to connect paths is created after the additional layers are created on the placeElements method
        await this.executePathsConnection();
        // apply variations after all the elements are displayed in the current map:
        this.applyVariations();
        let layers = this.generateLayersList();
        await this.debugHelper.writeDebugPathFinderFile(layers, 'test-path-finding-grid-', this.debugLayerData);
        // map template:
        let map = this.createTiledMapObject(layers);
        FileHandler.createFolder(this.generatedFolder);
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
        this.cleanAutoGeneratedProcessMapFiles();
        Logger.info('Map file successfully generated: ' + this.mapName);
        // after the main map was created, we can create the associated maps:
        return sc.deepJsonClone(map);
    }

    initializeMainPath()
    {
        let pathResult = this.pathConnector.placeMainPath(
            this.pathLayerData,
            this.mapGrid,
            this.mapWidth,
            this.mapHeight,
            this.generatedMainPathIndexes,
            this.generatedMainPathIndexesBorder,
            this.generatedReturnPoints,
            this.pathLayerProperties,
            this.hasAssociatedMap,
            this.mainPathStart
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
        if(pathResult){
            this.pathLayerData = pathResult.pathLayerData;
            this.debugLayerData = pathResult.debugLayerData;
            this.splitBorderLayer = pathResult.splitBorderLayer;
            this.pathInnerWallsLayer = pathResult.pathInnerWallsLayer;
            this.pathOuterWallsLayer = pathResult.pathOuterWallsLayer;
        }
    }

    createTiledMapObject(layers, width = 0, height = 0)
    {
        if(0 === width){
            width = this.mapWidth;
        }
        if(0 === height){
            height = this.mapHeight;
        }
        return {
            type: 'map',
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
            tilesets: [{
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
            }],
            layers
        };
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

    cleanAutoGeneratedProcessMapFiles()
    {
        if(!this.removeOptimizedMapFilesAfterGeneration){
            return;
        }
        let filePrefix = 'optimized-';
        let fileSuffix = '-elements';
        let fileStarts = 'optimized-elements-';
        let factor = '';
        if(this.factor){
            factor = '-x' + this.factor;
        }
        let fileExtensions = ['.png', '.json'];
        for(let extension of fileExtensions){
            let mapPath1 = this.mapFileFullPath.toString().replace('.json', '');
            let optimizedElementsFile = mapPath1.replace(this.mapName, filePrefix+this.mapName+fileSuffix+extension);
            let mapPath2 = this.mapFileFullPath.toString().replace('.json', '');
            let optimizedElementsFileFactor = mapPath2.replace(
                this.mapName,
                filePrefix+this.mapName+fileSuffix+factor+extension
            );
            if(FileHandler.exists(optimizedElementsFile)){
                FileHandler.remove(optimizedElementsFile);
            }
            if(FileHandler.exists(optimizedElementsFileFactor)){
                FileHandler.remove(optimizedElementsFileFactor);
            }
        }
        let folderFiles = FileHandler.readFolder(this.generatedFolder);
        for(let fileName of folderFiles){
            if(0 === fileName.indexOf(fileStarts)){
                FileHandler.remove(FileHandler.joinPaths(this.generatedFolder, fileName));
            }
        }
    }

    generateLayersList()
    {
        this.staticLayers = this.spotGenerator.generateInvisibleSpots(
            this.staticLayers,
            this.generatedSpots,
            this.mapWidth,
            this.mapHeight
        );
        let groundLayer = this.generateLayerWithData('ground', this.groundLayerData);
        if(!this.removeGroundLayer){
            this.staticLayers.push(groundLayer);
        }
        if(this.blockMapBorder && sc.isArray(this.borderLayer)){
            this.staticLayers.push(
                this.generateLayerWithData('collisions-map-border', this.borderLayer)
            );
        }
        if(0 < this.groundVariationsLayerData.length){
            this.staticLayers.push(
                this.generateLayerWithData('ground-variations', this.groundVariationsLayerData)
            );
        }
        if(this.pathLayerData){
            if(this.applyGroundAsPathTilePostProcess){
                this.pathLayerData = this.pathLayerData.map(tile => tile === this.pathTile ? this.groundTile : tile);
            }
            let pathLayer = this.generateLayerWithData('path', this.pathLayerData);
            pathLayer.properties = this.pathLayerProperties;
            this.staticLayers.push(pathLayer);
        }
        if(this.isValidLayer(this.pathInnerWallsLayer)){
            this.staticLayers.push(
                this.generateLayerWithData(
                    'path-borders-inner-walls'+this.splitBordersLayerSuffix,
                    this.pathInnerWallsLayer
                )
            );
        }
        if(sc.isArray(this.pathOuterWallsLayer) && 0 < this.pathOuterWallsLayer.length){
            this.staticLayers.push(
                this.generateLayerWithData(
                    'path-borders-outer-walls'+this.splitBordersLayerSuffix,
                    this.pathOuterWallsLayer
                )
            );
        }
        if(this.splitBordersInLayers && this.splitBorderLayer && 0 < this.splitBorderLayer.length){
            this.staticLayers.push(
                this.generateLayerWithData('path-borders'+this.splitBordersLayerSuffix, this.splitBorderLayer)
            );
        }
        // reduce file size by merging layers between each element layer:
        let layers = [...this.mergeLayersByTileValue(this.staticLayers, this.additionalLayers)];
        // re-order the layers to match spots specification (if any):
        layers = this.reorderLayersBasedOnSpots(layers);
        // replace any null values with 0 before filtering and log an error if there are any:
        for(let i = 0; i < layers.length; i++){
            if(layers[i].data){
                layers[i].data = layers[i].data.map((tile) => {
                    let isNullTile = tile === null;
                    if(isNullTile){
                        Logger.error('There is a NULL tile in the layer "'+layers[i].name+'" data.');
                    }
                    return isNullTile ? 0 : tile;
                });
            }
        }
        // reduce file size by removing fully empty layers:
        layers = layers.filter(layer => {
            let keepLayer = layer.data.some(tile => tile !== 0);
            if(!keepLayer){
                Logger.debug('Empty layer will be removed: '+layer.name);
            }
            return keepLayer;
        });
        // reduce file size by merging layers using the auto-merge keys:
        Logger.debug('Total layers before merge: '+layers.length);
        if(0 < this.autoMergeLayersByKeys.length){
            for(let matchKey of this.autoMergeLayersByKeys){
                layers = this.mergeLayersByNameSubstring(layers, matchKey);
            }
        }
        Logger.debug('Total layers after merge: '+layers.length);
        layers = this.applyLayersIds(layers);
        return layers;
    }

    isValidLayer(layerData)
    {
        return sc.isArray(layerData) && 0 < layerData.length;
    }

    applyLayersIds(layers)
    {
        let id = 1;
        for(let layer of layers){
            layer.id = id;
            id++;
        }
        return layers;
    }

    reorderLayersBasedOnSpots(layers)
    {
        if(0 === Object.keys(this.generateSpotsWithDepth).length){
            return layers;
        }
        let layerMap = new Map();
        for(let i = 0; i < layers.length; i++){
            layerMap.set(layers[i].name, i);
        }
        let reorderedLayers = [...layers];
        let spotKeys = Object.keys(this.generateSpotsWithDepth);
        for(let i = 0; i < spotKeys.length; i++){
            let spotKey = spotKeys[i];
            let spotConfig = this.generateSpotsWithDepth[spotKey];
            let layerNames = Object.keys(spotConfig.spotLayers);
            for(let j = 0; j < layerNames.length; j++){
                let layerName = layerNames[j];
                let currentIndex = layerMap.get(layerName);
                if(null === currentIndex || 0 === currentIndex || 0 < currentIndex){
                    this.reorderLayerBySpotDepth(
                        reorderedLayers,
                        layerMap,
                        layerName,
                        currentIndex,
                        spotConfig.depth,
                        layers.length
                    );
                }
            }
        }
        return reorderedLayers;
    }

    reorderLayerBySpotDepth(reorderedLayers, layerMap, layerName, currentIndex, spotDepth, layersLength)
    {
        let targetIndex = this.calculateTargetIndex(spotDepth, layersLength, layerMap, reorderedLayers);
        let layerToMove = reorderedLayers[currentIndex];
        reorderedLayers.splice(currentIndex, 1);
        reorderedLayers.splice(targetIndex, 0, layerToMove);
        this.updateLayerMap(reorderedLayers, layerMap);
        Logger.debug('Reordered layer '+layerName+' to depth '+targetIndex+' based on spot configuration');
    }

    calculateTargetIndex(spotDepth, layersLength, layerMap)
    {
        if(!spotDepth){
            return 1;
        }
        if('string' === typeof spotDepth){
            let referenceLayerIndex = layerMap.get(spotDepth);
            if(null === referenceLayerIndex || 0 === referenceLayerIndex || 0 < referenceLayerIndex){
                return referenceLayerIndex + 1;
            }
            return 1;
        }
        if(0 >= spotDepth){
            return 1;
        }
        if(layersLength <= spotDepth){
            return layersLength - 1;
        }
        return spotDepth;
    }

    updateLayerMap(layers, layerMap)
    {
        for(let i = 0; i < layers.length; i++){
            layerMap.set(layers[i].name, i);
        }
    }

    mergeLayersByNameSubstring(layers, matchKey)
    {
        let used = new Set();
        let result = [];
        for(let i = 0; i < layers.length; i++){
            if(used.has(i)) continue;
            let current = layers[i];
            if(!current.name.includes(matchKey)){
                result.push(current);
                continue;
            }
            let data = [...current.data];
            let name = current.name;
            for(let j = i + 1; j < layers.length; j++){
                if(used.has(j)) continue;
                let candidate = layers[j];
                if(!candidate.name.includes(matchKey)) continue;
                let collision = false;
                for(let t = 0; t < data.length; t++){
                    if(data[t] !== 0 && candidate.data[t] !== 0){
                        collision = true;
                        break;
                    }
                }
                if(!collision){
                    for(let t = 0; t < data.length; t++){
                        if(data[t] === 0) data[t] = candidate.data[t];
                    }
                    name += "-" + candidate.name;
                    used.add(j);
                }
            }
            result.push({...current, name: "merge-" + name, data});
        }
        return result;
    }

    generateLayerWithData(layerName, layerData, width = 0, height = 0)
    {
        if(0 === width){
            width = this.mapWidth;
        }
        if(0 === height){
            height = this.mapHeight;
        }
        let hasNullValues = layerData.some(tile => null === tile);
        if(hasNullValues){
            Logger.error('NULL tiles detected in layer "'+layerName+'", those will be replaced by 0 values.');
        }
        let sanitizedData = layerData.map(tile => null === tile || undefined === tile ? 0 : tile);
        return {
            data: sanitizedData,
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

    /**
     * @NOTE: all these parameters are not passed at any point in the generator, are optional for code extension.
     */
    calculateMapSizeWithFreeSpace(
        layerElements = false,
        elementsQuantity = false,
        freeSpaceTilesQuantity = false,
        elementsFreeSpaceAround = false
    ){
        if(false === layerElements){
            layerElements = this.layerElements;
        }
        if(!layerElements){
            Logger.error('No layer elements defined.');
            return false;
        }
        if(false === elementsQuantity){
            elementsQuantity = this.elementsQuantity;
        }
        if(!sc.isObject(elementsQuantity) || 0 === Object.keys(elementsQuantity).length){
            Logger.error('No layer elements quantity defined.');
            return false;
        }
        if(false === freeSpaceTilesQuantity){
            freeSpaceTilesQuantity = this.freeSpaceTilesQuantity;
        }
        let totalArea = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        // calculate the total area required by elements, including free space:
        for(let elementType of Object.keys(elementsQuantity)){
            if(!layerElements[elementType]){
                Logger.debug('No layer elements defined for element "'+elementType+'".');
                continue;
            }
            let element = this.fetchFirstTilesLayer(layerElements[elementType]);
            if(!element){
                Logger.error('Element "tilelayer" not found: ' + elementType);
                continue;
            }
            let quantity = elementsQuantity[elementType];
            let freeSpaceAround = this.determineElementFreeSpaceAround(elementType, elementsFreeSpaceAround);
            let freeSpaceUpDownLeftRight = freeSpaceAround * this.freeSpaceMultiplier;
            let freeTilesUpDownLeftRight = freeSpaceTilesQuantity * this.freeTilesMultiplier;
            let widthPlusFreeTiles = element.width + freeTilesUpDownLeftRight + freeSpaceUpDownLeftRight;
            let heightPlusFreeTiles = element.height + freeTilesUpDownLeftRight + freeSpaceUpDownLeftRight;
            let elementArea = widthPlusFreeTiles * heightPlusFreeTiles * quantity;
            totalArea += elementArea;
            // track max width and height for the single largest element with free space:
            maxWidth = Math.max(maxWidth, widthPlusFreeTiles);
            maxHeight = Math.max(maxHeight, heightPlusFreeTiles);
        }
        // estimate square root of total area to get a base size for width and height:
        let baseSize = Math.ceil(Math.sqrt(totalArea));
        // ensure the base size is at least as large as the largest element's width or height:
        baseSize = Math.max(baseSize, maxWidth, maxHeight);
        // adjust baseSize to ensure it can accommodate the largest element's width or height:
        let mapWidth = baseSize + (this.minimumDistanceFromBorders * 2);
        let mapHeight = baseSize + (this.minimumDistanceFromBorders * 2);
        // add border size if blocked:
        if(this.blockMapBorder){
            mapWidth++;
            mapHeight++;
        }
        return { mapWidth, mapHeight };
    }

    determineElementFreeSpaceAround(elementType, elementsFreeSpaceAround)
    {
        let minimumFreeSpace = this.calculateMinimumFreeSpace();
        if(!sc.isObject(elementsFreeSpaceAround)){
            if(!sc.isObject(this.elementsFreeSpaceAround)){
                return minimumFreeSpace;
            }
            elementsFreeSpaceAround = this.elementsFreeSpaceAround;
        }
        return sc.get(elementsFreeSpaceAround, elementType, minimumFreeSpace);
    }

    calculateMinimumFreeSpace()
    {
        if(1 < this.pathSize){
            return Math.max(this.minimumElementsFreeSpaceAround, this.pathSize);
        }
        return this.minimumElementsFreeSpaceAround;
    }

    determineElementAllowPathsInFreeSpace(elementType, allowPathsInFreeSpace)
    {
        if(!sc.isObject(allowPathsInFreeSpace)){
            allowPathsInFreeSpace = Object.assign(
                this.elementsAllowPathsInFreeSpace,
                sc.get(this.elementsProvider, 'allowPathsInFreeSpace', {})
            );
        }
        return sc.get(allowPathsInFreeSpace, elementType, this.defaultElementsAllowPathsInFreeSpace);
    }

    fetchFirstTilesLayer(elementLayers)
    {
        for(let layer of elementLayers){
            if('tilelayer' === layer.type){
                return layer;
            }
        }
        return false;
    }

    updateLayerData(elementData, elementNumber, baseElementData)
    {
        let layerIndex = this.additionalLayers.findIndex(layer => layer.name === elementData.name);
        if(-1 === layerIndex){
            Logger.warning('Layer index not found.', elementData.name);
            return;
        }
        let layer = this.additionalLayers[layerIndex];
        Logger.debug('Update layer data: '+layer.name);
        layer.properties = elementData.properties;
        let mapPrefix = this.removeFloorFromMapName();
        let currentFloorNumber = Number(this.fetchMapProperty('currentFloor').value || 0);
        let currentFloorKey = (this.fetchMapProperty('floorKey').value || '').toString();
        let freeSpaceAround = sc.get(baseElementData, 'freeSpaceAround', 0);
        for(let y = 0; y < elementData.height; y++){
            for(let x = 0; x < elementData.width; x++){
                let tileIndex = y * elementData.width + x;
                let gridY = elementData.position.y + y;
                let gridX = elementData.position.x + x;
                let mapIndex = gridY * this.mapWidth + gridX;
                // @NOTE: could mark only borders, but will have issues if another element unblock the same tile after.
                this.markFreeSpaceAroundElementAsNotAvailable(
                    freeSpaceAround,
                    gridY,
                    gridX,
                    elementData.name,
                    elementData.allowPathsInFreeSpace
                );
                if(!this.allowPlacePathOverElementsFreeArea){
                    this.mapGrid[gridY][gridX] = false;
                }
                let isZeroTile = 0 === elementData.data[tileIndex];
                if(isZeroTile){
                    continue;
                }
                layer.data[mapIndex] = elementData.data[tileIndex];
                this.mapGrid[gridY][gridX] = false;
                this.updateLayerChangePointsData(
                    layer,
                    mapPrefix,
                    elementData,
                    elementNumber,
                    currentFloorNumber,
                    currentFloorKey,
                    tileIndex,
                    mapIndex,
                    x,
                    y
                );
                this.updateLayerWithReturnPointsData(
                    layer,
                    mapPrefix,
                    elementData,
                    elementNumber,
                    currentFloorNumber,
                    currentFloorKey,
                    tileIndex,
                    x,
                    y,
                    gridX,
                    gridY
                );
            }
        }
    }

    markFreeSpaceAroundElementAsNotAvailable(freeSpaceAround, gridY, gridX, elementName, allowPathsInFreeSpace)
    {
        if(0 === freeSpaceAround){
            return;
        }
        let gridIndex = gridY *  this.mapWidth + gridX;
        if(this.pathTile === this.pathLayerData[gridIndex]){
            return;
        }
        let pointSaveKey = gridY+'/'+gridX;
        if(-1 !== this.temporalBlockedPositionsToAvoidElementsList.indexOf(pointSaveKey)){
            return;
        }
        // @NOTE: since the free space around could be more than 1 tile, we need to block all the free tiles until we
        // reach the elements and all the free tiles after the element.
        for(let i = 1; i <= freeSpaceAround; i++){
            let previousTileY = gridY - freeSpaceAround;
            let previousTileX = gridX - freeSpaceAround;
            let nextTileY = gridY + freeSpaceAround;
            let nextTileX = gridX + freeSpaceAround;
            let savePoint = {previousTileY, previousTileX, nextTileY, nextTileX, elementName, allowPathsInFreeSpace};
            this.mapGridBuilder.markMapGridPosition(this.mapGrid, previousTileY, previousTileX, false);
            this.mapGridBuilder.markMapGridPosition(this.mapGrid, previousTileY, nextTileX, false);
            this.mapGridBuilder.markMapGridPosition(this.mapGrid, nextTileY, previousTileX, false);
            this.mapGridBuilder.markMapGridPosition(this.mapGrid, nextTileY, nextTileX, false);
            this.temporalBlockedPositionsToAvoidElements.push(savePoint);
            this.temporalBlockedPositionsToAvoidElementsList.push(pointSaveKey);
        }
    }

    updateLayerChangePointsData(
        layer,
        mapPrefix,
        elementData,
        elementNumber,
        currentFloorNumber,
        currentFloorKey,
        tileIndex,
        mapIndex,
        x,
        y
    ){
        let isChangePointsLayer = -1 !== layer.name.indexOf('change-points');
        if(!isChangePointsLayer){
            return;
        }
        let elementKey = this.provideElementKey(
            mapPrefix,
            elementData,
            elementNumber,
            currentFloorNumber,
            currentFloorKey
        );
        let elementExists = sc.hasOwn(this.generatedChangePoints, elementKey);
        if(elementExists){
            return;
        }
        // when the element name is indexOf 'stairs-' then we need to look up for the stairs number property
        this.generatedChangePoints[elementKey] = {
            elementData,
            tileIndex,
            mapIndex,
            elementNumber,
            x,
            y
        };
        if(!layer.properties){
            layer.properties = [];
        }
        layer.properties.push({
            name: 'change-point-for-' + elementKey,
            type: 'int',
            value: mapIndex
        });
    }

    updateLayerWithReturnPointsData(
        layer,
        mapPrefix,
        elementData,
        elementNumber,
        currentFloorNumber,
        currentFloorKey,
        tileIndex,
        x,
        y,
        gridX,
        gridY
    ){
        if(0 === tileIndex){
            return;
        }
        let isReturnPointLayer = -1 !== layer.name.indexOf('return-point');
        if(!isReturnPointLayer){
            return;
        }
        let elementKey = this.provideElementKey(
            mapPrefix,
            elementData,
            elementNumber,
            currentFloorNumber,
            currentFloorKey
        );
        let elementExists = sc.hasOwn(this.generatedReturnPoints, elementKey);
        if(elementExists){
            return;
        }
        let returnPointPosition = this.provideReturnPositionKeyFromLayer(layer);
        let returnPointIndex = this.provideReturnIndexByPosition(x, y, elementData);
        this.generatedReturnPoints[elementKey] = {
            tileIndex,
            mapIndex: returnPointIndex,
            x: gridX,
            y: gridY,
            position: returnPointPosition
        };
        let prefix = 'return-point-';
        let pointName = elementKey;
        let type = 'int';
        this.pathLayerProperties.push(
            {name: prefix+'for-'+pointName, type, value: returnPointIndex},
            {name: prefix+'x-'+pointName, type, value: gridX},
            {name: prefix+'y-'+pointName, type, value: gridY},
            {name: prefix+'position-'+pointName, type: 'string', value: returnPointPosition},
        );
    }

    provideReturnPositionKeyFromLayer(layer)
    {
        if(!layer || !layer.properties){
            return 'down';
        }
        for(let property of layer.properties){
            if('position' === property.name){
                return property.value;
            }
        }
        return 'down';
    }

    provideElementKey(mapPrefix, elementData, elementNumber, currentFloorNumber, currentFloorKey)
    {
        let elementKey = mapPrefix.toString();
        let elementNameClean = elementData.name.replace('-change-points', '').replace('-return-point', '');
        let isStairsElement = -1 !== elementData.name.indexOf('stairs');
        if(!isStairsElement){
            return elementKey + '-' + elementNameClean + '-n' + elementNumber;
        }
        let upperFloorString = '';
        let downFloorString = '';
        if(0 === currentFloorNumber){
            upperFloorString = '-upperFloor-n1';
            downFloorString = '-downFloor-n1';
        }
        if(1 === currentFloorNumber){
            if('upper' === currentFloorKey){
                upperFloorString = '-upperFloor-n2';
                downFloorString = '';
            }
            if('down' === currentFloorKey){
                upperFloorString = '';
                downFloorString = '-downFloor-n2';
            }
        }
        if(1 < currentFloorNumber){
            let nextUpperFloor = currentFloorNumber + 1;
            let nextDownFloor = currentFloorNumber - 1;
            upperFloorString = '-' + currentFloorKey + 'Floor-n' + nextUpperFloor;
            downFloorString = '-' + currentFloorKey + 'Floor-n' + nextDownFloor;
        }
        return elementKey + elementNameClean
            .replace('stairs-up', upperFloorString)
            .replace('stairs-down', downFloorString);
    }

    removeFloorFromMapName()
    {
        let mapName = this.mapName.toString();
        let mapNamePartsUp = mapName.split('-upperFloor-n');
        let removedUpper = mapNamePartsUp[0];
        let removedPartsDown = removedUpper.split('-downFloor-n');
        return removedPartsDown[0];
    }

    async placeElements()
    {
        this.generateAdditionalLayers();
        this.prePlaceStairs();
        await this.placeCenteredElements();
        let loopElementsQuantity = !this.orderElementsBySize ? this.elementsQuantity : this.sortedElementsQuantity();
        let randomizedElementsQuantity = [];
        for(let elementType of Object.keys(loopElementsQuantity)){
            for(let q = 0; q < loopElementsQuantity[elementType]; q++){
                if(!this.randomizeQuantities){
                    this.placeElementOnMap(elementType, q);
                    continue;
                }
                randomizedElementsQuantity.push(elementType);
            }
        }
        randomizedElementsQuantity = this.shuffleArray(randomizedElementsQuantity);
        if(this.randomizeQuantities){
            let q = 0;
            for(let elementType of randomizedElementsQuantity){
                this.placeElementOnMap(elementType, q);
                q++;
            }
        }
        // filter out layers without any tiles set:
        this.additionalLayers = this.additionalLayers.filter(layer => layer.data.some(tile => tile !== 0));
    }

    async placeCenteredElements()
    {
        if(!this.mapCenteredElements){
            return;
        }
        let elementsKeys = Object.keys(this.mapCenteredElements);
        if(0 === elementsKeys.length){
            return;
        }
        let orderedElements = [];
        for(let i = 0; i < elementsKeys.length; i++){
            let elementKey = elementsKeys[i];
            if(this.layerElements[elementKey]){
                orderedElements.push({
                    key: elementKey,
                    order: this.mapCenteredElements[elementKey]
                });
            }
        }
        if(0 === orderedElements.length){
            return;
        }
        orderedElements.sort((a, b) => a.order - b.order);
        let mapCenterX = Math.floor(this.mapWidth / 2);
        let mapCenterY = Math.floor(this.mapHeight / 2);
        let placementOffsets = this.placementOffsets();
        let placedElements = [];
        let firstElementKey = orderedElements[0].key;
        if(0 < this.elementsQuantity[firstElementKey]){
            let firstElement = this.fetchFirstTilesLayer(this.layerElements[firstElementKey]);
            if(!firstElement){
                Logger.error('First centered element not found: '+firstElementKey);
                return;
            }
            let freeSpaceAround = this.determineElementFreeSpaceAround(firstElementKey);
            let posX = mapCenterX - Math.floor(firstElement.width / 2);
            let posY = mapCenterY - Math.floor(firstElement.height / 2);
            let canPlaceFirst = this.canPlaceElementCentered(
                posX,
                posY,
                firstElement.width,
                firstElement.height,
                placedElements
            );
            if(!canPlaceFirst){
                Logger.critical('Could not place first centered element at map center: '+firstElementKey);
                return;
            }
            this.placeElementOnMap(firstElementKey, 0, {x: posX, y: posY});
            placedElements.push({
                type: firstElementKey,
                position: {x: posX, y: posY},
                width: firstElement.width,
                height: firstElement.height,
                freeSpaceAround: freeSpaceAround
            });
            this.elementsQuantity[firstElementKey]--;
            await this.debugHelper.debugAdjacentSpots(
                {x: posX, y: posY},
                {width: firstElement.width, height: firstElement.height},
                freeSpaceAround,
                this.mapWidth,
                this.mapHeight
            );
        }
        for(let i = 0; i < orderedElements.length; i++){
            let elementKey = orderedElements[i].key;
            let quantity = this.elementsQuantity[elementKey] || 0;
            if(0 === quantity){
                continue;
            }
            for(let q = 0; q < quantity; q++){
                let element = this.fetchFirstTilesLayer(this.layerElements[elementKey]);
                if(!element){
                    Logger.error('Centered element not found: '+elementKey);
                    continue;
                }
                let elementFreeSpace = this.determineElementFreeSpaceAround(elementKey);
                let placed = false;
                let multiplyFactor = 1;
                for(let attempts = 0; attempts < placementOffsets.length * 4 && !placed; attempts++){
                    if(attempts > 0 && attempts % placementOffsets.length === 0){
                        multiplyFactor++;
                    }
                    let offsetPos = attempts % placementOffsets.length;
                    let offset = placementOffsets[offsetPos];
                    let offsetX = offset.x * (element.width + elementFreeSpace * 2) * multiplyFactor;
                    let offsetY = offset.y * (element.height + elementFreeSpace * 2) * multiplyFactor;
                    let posX = mapCenterX - Math.floor(element.width / 2) + offsetX;
                    let posY = mapCenterY - Math.floor(element.height / 2) + offsetY;
                    if(this.canPlaceElementCentered(
                        posX,
                        posY,
                        element.width,
                        element.height,
                        placedElements
                    )){
                        this.placeElementOnMap(elementKey, q, {x: posX, y: posY});
                        placedElements.push({
                            type: elementKey,
                            position: {x: posX, y: posY},
                            width: element.width,
                            height: element.height,
                            freeSpaceAround: elementFreeSpace
                        });
                        placed = true;
                    }
                }
                if(!placed){
                    Logger.critical('Could not place centered element: '+elementKey);
                }
            }
            this.elementsQuantity[elementKey] = 0;
        }
        this.centerPlacedElements = placedElements;
    }

    canPlaceElementCentered(x, y, width, height, placedElements)
    {
        if(0 > x || 0 > y || x + width > this.mapWidth || y + height > this.mapHeight){
            return false;
        }
        for(let element of placedElements){
            let freeSpace = Math.max(sc.get(element, 'freeSpaceAround', 0), this.calculateMinimumFreeSpace());
            let e1Left = x;
            let e1Right = x + width;
            let e1Top = y;
            let e1Bottom = y + height;
            let e2Left = element.position.x - freeSpace;
            let e2Right = element.position.x + element.width + freeSpace;
            let e2Top = element.position.y - freeSpace;
            let e2Bottom = element.position.y + element.height + freeSpace;
            if(!(e1Right <= e2Left || e1Left >= e2Right || e1Bottom <= e2Top || e1Top >= e2Bottom)){
                return false;
            }
        }
        for(let i = y; i < y + height; i++){
            for(let j = x; j < x + width; j++){
                if(!this.mapGrid[i][j]){
                    return false;
                }
            }
        }
        return true;
    }

    placementOffsets()
    {
        return [
            {x: 1, y: 0},
            {x: 1, y: 1},
            {x: 0, y: 1},
            {x: -1, y: 1},
            {x: -1, y: 0},
            {x: -1, y: -1},
            {x: 0, y: -1},
            {x: 1, y: -1}
        ];
    }

    generateAdditionalLayers()
    {
        let addedLayerNames = new Set();
        for(let elementType of Object.keys(this.layerElements)){
            for(let layer of this.layerElements[elementType]){
                if(!layer.visible){
                    Logger.warning('Layer "'+layer.name+'" not visible.');
                    continue;
                }
                if(addedLayerNames.has(layer.name)){
                    continue;
                }
                // only include layers once by unique names:
                this.additionalLayers.push(
                    this.generateLayerWithData(layer.name, Array(this.mapWidth * this.mapHeight).fill(0))
                );
                addedLayerNames.add(layer.name);
            }
        }
    }

    prePlaceStairs()
    {
        let hasStairsUp = 0 < this.elementsQuantity['stairs-up'];
        let hasStairsDown = 0 < this.elementsQuantity['stairs-down'];
        if(
            !sc.hasOwn(this.previousFloorData, 'floorKey')
            || (!this.previousFloorData['stairs-up'] && !this.previousFloorData['stairs-down'])
            || (!hasStairsUp && !hasStairsDown)
        ){
            return;
        }
        if(hasStairsUp && this.previousFloorData['stairs-down'] && 'down' === this.previousFloorData['floorKey']){
            this.placeElementOnMap('stairs-up', 0, this.previousFloorData['stairs-down']);
            delete this.elementsQuantity['stairs-up'];
        }
        if(hasStairsDown && this.previousFloorData['stairs-up'] && 'upper' === this.previousFloorData['floorKey']){
            this.placeElementOnMap('stairs-down', 0, this.previousFloorData['stairs-up']);
            delete this.elementsQuantity['stairs-down'];
        }
    }

    shuffleArray(array)
    {
        let newArray = [...array];
        for(let i = newArray.length - 1; i > 0; i--){
            let j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * @NOTE: position is only used on stairs to place one stair in the same position as the previous floor.
     */
    placeElementOnMap(elementType, elementNumber, position = false)
    {
        let elementLayersDataArray = this.layerElements[elementType];
        if(!elementLayersDataArray){
            Logger.debug('No layers found for element "'+elementType+'".');
            return;
        }
        let baseElementData = this.fetchFirstTilesLayer(elementLayersDataArray);
        baseElementData.freeSpaceAround = this.determineElementFreeSpaceAround(elementType);
        baseElementData.allowPathsInFreeSpace = this.determineElementAllowPathsInFreeSpace(elementType);
        Logger.debug({elementType, elementNumber, ...baseElementData});
        if(!position){
            // we need to multiply the freeSpaceAround to cover the directions up, down, left, right:
            let elementWithFreeSpaceWidth = baseElementData.width + baseElementData.freeSpaceAround * 2;
            let elementWithFreeSpaceHeight = baseElementData.height + baseElementData.freeSpaceAround * 2;
            position = this.findPosition(elementWithFreeSpaceWidth, elementWithFreeSpaceHeight);
        }
        if(!position){
            Logger.warning('Position not found for element "'+elementType+'" in map "'+this.mapName+'".');
            return;
        }
        if(elementType === 'stairs-up' || elementType === 'stairs-down'){
            this.generatedFloorData[elementType] = position;
        }
        for(let elementLayer of elementLayersDataArray){
            if('tilelayer' !== elementLayer.type){
                continue;
            }
            // check layer visibility
            if(!elementLayer.visible){
                Logger.warning('Layer "'+elementLayer.name+'" not visible.');
                continue;
            }
            elementLayer.position = position;
            Logger.debug('Place element "'+elementType+'".', position, elementLayer.name);
            // update each layer with the element tiles at the determined position:
            this.updateLayerData(elementLayer, elementNumber, baseElementData);
        }
    }

    sortedElementsQuantity()
    {
        // calculate area for each key:
        let elementsWithArea = Object.keys(this.elementsQuantity).map(key => {
            let area = 0;
            if(this.layerElements[key] && this.layerElements[key].length > 0){
                let layerData = this.fetchFirstTilesLayer(this.layerElements[key]);
                area = layerData.height * layerData.width;
            }
            return {key, area, quantity: this.elementsQuantity[key]};
        });
        // sort by area:
        elementsWithArea.sort((a, b) => b.area - a.area);
        let sorted = {};
        for(let element of elementsWithArea){
            sorted[element.key] = element.quantity;
        }
        return sorted;
    }

    findPosition(elementWidth, elementHeight)
    {
        if('inOrder' === this.placeElementsOrder){
            return this.findNextAvailablePosition(elementWidth, elementHeight);
        }
        if('random' === this.placeElementsOrder){
            return this.findRandomPosition(elementWidth, elementHeight);
        }
        return null;
    }

    findNextAvailablePosition(elementWidth, elementHeight)
    {
        for(let y = 0; y < this.mapHeight; y++){
            for(let x = 0; x < this.mapWidth; x++){
                if(this.canPlaceElement(x, y , elementWidth, elementHeight)){
                    return {x, y};
                }
            }
        }
        return null;
    }

    findRandomPosition(width, height)
    {
        if(!this.placeElementsCloserToBorders){
            return this.findRandomPositionOnAnywhere(width, height);
        }
        return this.findRandomPositionCloserToBorders(width, height);
    }

    findRandomPositionOnAnywhere(width, height)
    {
        let maxTries = 200;
        let tries = 0;
        while(tries < maxTries){
            let x = Math.floor(Math.random() * (this.mapWidth - width));
            let y = Math.floor(Math.random() * (this.mapHeight - height));
            if(this.canPlaceElement(x, y, width, height)){
                return {x, y};
            }
            tries++;
        }
        return null;
    }

    findRandomPositionCloserToBorders(width, height)
    {
        let maxTries = this.mapWidth * this.mapHeight;
        let position = this.tryEdgePositions(width, height);
        if(null !== position){
            return position;
        }
        position = this.tryDistributedBorderPositions(width, height);
        if(null !== position){
            return position;
        }
        return this.tryGridPositions(width, height, maxTries);
    }

    tryEdgePositions(width, height)
    {
        let cornerPositions = [
            {x: 0, y: 0},
            {x: this.mapWidth - width, y: 0},
            {x: 0, y: this.mapHeight - height},
            {x: this.mapWidth - width, y: this.mapHeight - height}
        ];
        for(let pos of cornerPositions){
            if(this.canPlaceElement(pos.x, pos.y, width, height)){
                return pos;
            }
        }
        return null;
    }

    tryDistributedBorderPositions(width, height)
    {
        let topPositions = [];
        let rightPositions = [];
        let bottomPositions = [];
        let leftPositions = [];
        let segmentWidth = Math.floor(this.mapWidth / 3);
        for(let x = 0; x <= this.mapWidth - width; x += segmentWidth){
            topPositions.push({x: x, y: 0});
        }
        let segmentHeight = Math.floor(this.mapHeight / 3);
        for(let y = 0; y <= this.mapHeight - height; y += segmentHeight){
            rightPositions.push({x: this.mapWidth - width, y: y});
        }
        for(let x = this.mapWidth - width; x >= 0; x -= segmentWidth){
            bottomPositions.push({x: x, y: this.mapHeight - height});
        }
        for(let y = this.mapHeight - height; y >= 0; y -= segmentHeight){
            leftPositions.push({x: 0, y: y});
        }
        let allPositions = [...topPositions, ...rightPositions, ...bottomPositions, ...leftPositions];
        for(let pos of allPositions){
            if(this.canPlaceElement(pos.x, pos.y, width, height)){
                return pos;
            }
        }
        return null;
    }

    tryGridPositions(width, height, maxTries)
    {
        let minDimension = Math.min(this.mapWidth, this.mapHeight);
        let maxRings = Math.floor(minDimension / 2);
        for(let ring = 0; ring < maxRings; ring++){
            let minX = ring;
            let minY = ring;
            let maxX = this.mapWidth - width - ring;
            let maxY = this.mapHeight - height - ring;
            for(let y = minY; y <= maxY; y++){
                if(this.canPlaceElement(minX, y, width, height)){
                    return {x: minX, y: y};
                }
                if(this.canPlaceElement(maxX, y, width, height)){
                    return {x: maxX, y: y};
                }
            }
            for(let x = minX + 1; x < maxX; x++){
                if(this.canPlaceElement(x, minY, width, height)){
                    return {x: x, y: minY};
                }
                if(this.canPlaceElement(x, maxY, width, height)){
                    return {x: x, y: maxY};
                }
            }
        }
        for(let tries = 0; tries < maxTries; tries++){
            let x = Math.floor(Math.random() * (this.mapWidth - width));
            let y = Math.floor(Math.random() * (this.mapHeight - height));
            if(this.canPlaceElement(x, y, width, height)){
                return {x, y};
            }
        }
        return null;
    }

    canPlaceElement(x, y, width, height)
    {
        if(0 < this.minimumDistanceFromBorders){
            if(x < this.minimumDistanceFromBorders){
                return false;
            }
            if(y < this.minimumDistanceFromBorders){
                return false;
            }
            if(x + width > this.mapWidth - this.minimumDistanceFromBorders){
                return false;
            }
            if(y + height > this.mapHeight - this.minimumDistanceFromBorders){
                return false;
            }
        }
        for(let i = y; i < y + height; i++){
            for(let j = x; j < x + width; j++){
                if(!this.mapGrid[i][j]){
                    return false;
                }
            }
        }
        return true;
    }

    applyVariations()
    {
        if(0 === this.randomGroundTiles.length){
            return;
        }
        let totalTiles = this.pathLayerData.filter(tile => tile === 0).length;
        this.groundVariationsLayerData = this.applyTilesVariations(
            Array(this.mapWidth * this.mapHeight).fill(0),
            this.mapWidth,
            this.mapHeight,
            totalTiles,
            this.randomGroundTiles,
            this.variableTilesPercentage,
            this.pathLayerData
        );
    }

    applyTilesVariations(
        applyOnLayerData,
        width,
        height,
        totalTiles,
        variationsTiles,
        variableTilesPercentage,
        checkTileOnLayerData = false,
        checkTileValue = 0
    ){
        if(0 === variationsTiles.length){
            return;
        }
        let tilesToChange = Math.floor(totalTiles * (variableTilesPercentage / 100));
        let applied = 0;
        for(let i = 0; applied < tilesToChange && i < totalTiles; i++){
            let x = Math.floor(Math.random() * width);
            let y = Math.floor(Math.random() * height);
            let position = y * width + x;
            if(!checkTileOnLayerData || checkTileValue === checkTileOnLayerData[position]){
                applyOnLayerData[position] = variationsTiles[Math.floor(Math.random() * variationsTiles.length)];
                applied++;
            }
        }
        return applyOnLayerData;
    }

    provideReturnIndexByPosition(x, y, elementData)
    {
        x = this.fetchValueForX(x);
        y = this.fetchValueForY(y);
        if(elementData?.position){
            return (elementData.position.y + y) * this.mapWidth + (elementData.position.x + x);
        }
        return y * this.mapWidth + x;
    }

    fetchValueForY(y)
    {
        // do not allow borders
        if(0 === y){
            return 1;
        }
        if(this.mapHeight - 1 === y){
            return this.mapHeight - 2;
        }
        return y;
    }

    fetchValueForX(x)
    {
        // do not allow borders
        if(0 === x){
            return 1;
        }
        if(this.mapWidth - 1 === x){
            return this.mapWidth - 2;
        }
        return x;
    }

    populateCollisionsMapBorder()
    {
        if(!this.blockMapBorder){
            return false;
        }
        this.borderLayer = Array(this.mapWidth * this.mapHeight).fill(0);
        let borderTile = this.borderTile || this.groundTile;
        let bottomLeftIndex = (this.mapHeight - 1) * this.mapWidth;
        for(let x = 0; x < this.mapWidth; x++){
            // top border:
            this.borderLayer[x] = this.bordersTiles['top'] || borderTile;
            // bottom border:
            this.borderLayer[bottomLeftIndex+x] = this.bordersTiles['bottom'] || borderTile;
        }
        let rightIndex = this.mapWidth - 1;
        for(let y = 0; y < this.mapHeight; y++){
            // left border:
            let leftIndex = y * this.mapWidth;
            this.borderLayer[leftIndex] = this.bordersTiles['left'] || borderTile;
            // right border:
            this.borderLayer[leftIndex + rightIndex] = this.bordersTiles['right'] || borderTile;
        }
        if(this.validateBorderCorners()){
            this.borderLayer[0] = this.bordersTiles['top-left'];
            this.borderLayer[rightIndex] = this.bordersTiles['top-right'];
            this.borderLayer[bottomLeftIndex] = this.bordersTiles['bottom-left'];
            this.borderLayer[bottomLeftIndex + rightIndex] = this.bordersTiles['bottom-right'];
        }
        if(!this.isBorderWalkable){
            this.mapGridBuilder.markBorderAsNotWalkable(this.mapGrid, this.mapWidth, this.mapHeight);
        }
        this.createEntryPosition();
    }

    createEntryPosition()
    {
        if('' === this.entryPosition){
            return;
        }
        let entryPositionParts = this.entryPosition.split('-');
        if(2 !== entryPositionParts.length){
            Logger.critical('Could not create entry position.', this.entryPosition);
            return;
        }
        let direction = entryPositionParts[0];
        let position = entryPositionParts[1];
        let {x, y, xReturn, yReturn, returnPointPosition} = this.determinePositionInMap(direction, position);
        if(null === x || null === y){
            Logger.critical('Invalid entry position data.', {entryPosition: this.entryPosition, x, y});
            return;
        }
        let mainMapChangePointLayer = Array(this.mapWidth * this.mapHeight).fill(0);
        let layerProperties = [];
        for(let i = 0; i < this.entryPositionSize; i++){
            // mark the entry position with 0 in the border layer:
            let mapIndex = y * this.mapWidth + x + i;
            this.borderLayer[mapIndex] = 0;
            // marking the mapGrid position as walkable
            this.mapGridBuilder.markMapGridPosition(this.mapGrid, y, x + i, true);
            mainMapChangePointLayer[mapIndex] = this.groundTile;
            if(this.entryPositionFrom){
                this.generatedChangePoints['return-to-main-map'] = {
                    tileIndex: this.groundTile,
                    mapIndex,
                    y,
                    x
                };
                layerProperties.push({
                    name: 'change-point-for-'+this.entryPositionFrom,
                    type: 'int',
                    value: mapIndex
                });
                if(!this.generatedReturnPoints[this.mapName]){
                    let returnPointMapIndex = yReturn * this.mapWidth + xReturn + i;
                    this.generatedReturnPoints[this.mapName] = {
                        tileIndex: this.groundTile,
                        mapIndex: returnPointMapIndex,
                        x: xReturn,
                        y: yReturn,
                        position: returnPointPosition
                    };
                    let prefix = 'return-point-';
                    let pointName = this.entryPositionFrom;
                    let type = 'int';
                    layerProperties.push(
                        {name: prefix+'for-'+pointName, type, value: returnPointMapIndex},
                        {name: prefix+'x-'+pointName, type, value: xReturn},
                        {name: prefix+'y-'+pointName, type, value: yReturn},
                        {name: prefix+'position-'+pointName, type: 'string', value: returnPointPosition},
                        {name: prefix+'isDefault-'+pointName, type: 'bool', value: true}
                    );
                }
            }
        }
        let generatedLayer = this.generateLayerWithData('return-to-main-map-change-points', mainMapChangePointLayer);
        generatedLayer.properties = layerProperties;
        // mark this layer name as added:
        this.additionalLayers.push(generatedLayer);
    }

    determinePositionInMap(direction, position)
    {
        let x = null;
        let y = null;
        let yReturn = null;
        let returnPointPosition = 'down';
        // @TODO - BETA - Include directions left and right as returnPointPosition.
        if(direction === 'top'){
            y = 0;
            yReturn = 1;
        }
        if(direction === 'down'){
            y = this.mapHeight - 1;
            yReturn = this.mapHeight - 2;
            returnPointPosition = 'up';
        }
        if(position === 'left'){
            x = 1; // 1 instead of 0, since 0 is the vertical wall
        }
        if(position === 'middle'){
            // map width / 2 - entry position size / 2 to get the entry position in the middle:
            x = Math.floor(this.mapWidth / 2) - Math.floor(this.entryPositionSize / 2);
        }
        if(position === 'right'){
            // the first -1 is for the map vertical wall
            x = this.mapWidth - 1 - this.entryPositionSize;
        }
        return {x, y, xReturn: x, yReturn, returnPointPosition};
    }

    validateBorderCorners()
    {
        return this.bordersTiles['top-left']
            && this.bordersTiles['top-right']
            && this.bordersTiles['bottom-left']
            && this.bordersTiles['bottom-right'];
    }

    mergeLayersByTileValue(staticLayers, additionalLayers)
    {
        let combinedLayers = [...staticLayers, ...additionalLayers];
        // use a map to track merged layers by name:
        let mergedLayersByName = new Map();
        for(let layer of combinedLayers){
            // @TODO - BETA - Create convention for "merge-#" in layers name and merge them to reduce the file size.
            // if the layer has already been encountered, merge their data:
            if(mergedLayersByName.has(layer.name)){
                let existingLayer = mergedLayersByName.get(layer.name);
                // merge data arrays, preferring non-zero values:
                existingLayer.data = existingLayer.data.map((tile, index) => tile > 0 ? tile : layer.data[index]);
                continue;
            }
            // clone the layer to avoid mutating the original objects:
            let clonedLayer = sc.deepJsonClone(layer);
            mergedLayersByName.set(layer.name, clonedLayer);
        }
        // convert the merged layers back into an array:
        return Array.from(mergedLayersByName.values());
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

    applyBordersAndCornersTiles(layerData, mapWidth, mapHeight, tilesShortcuts)
    {
        // @TODO - BETA - Extract into an BordersPatterns class.
        // let {p, sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = tilesShortcuts;
        let { step1, step2, step3, step4, step5, step6 } = BordersAndCornersTiles.sequences(tilesShortcuts);
        layerData = this.pathConnector.applyRotationToCompletePathGrid(tilesShortcuts.p, layerData, mapWidth, mapHeight);
        // this has to happen in sequence to not mess up the rotation:
        this.replaceSequences(layerData, step1, mapWidth);
        // rotate the path:
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequences(layerData, step2, mapHeight);
        // rollback rotation:
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        // add corners:
        this.replaceSequences(layerData, step3, mapWidth);
        // rotate to add upper corners:
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequences(layerData, step4, mapHeight);
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        // restore rotation and fix round corners:
        this.replaceSequences(layerData, step5, mapWidth);
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequences(layerData, step6, mapHeight);
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        return layerData;
    }

    replaceSequences(layerData, sequencesData, mapWidth)
    {
        for(let i = 0; i < sequencesData.length; i++){
            this.replaceSequence(layerData, sequencesData[i][0], sequencesData[i][1], mapWidth);
        }
    }

    replaceSequence(layerData, originalSequence, replaceSequence, mapWidth)
    {
        let clonedArray = [...layerData];
        let originalSeqArray = originalSequence.map(Number);
        let replaceSeqArray = replaceSequence.map(Number);
        for(let i = 0; i <= layerData.length - originalSeqArray.length; i++){
            let skip = false;
            for(let offset = 1; offset < originalSeqArray.length; offset++){
                if(Math.floor((i + offset) / mapWidth) !== Math.floor(i / mapWidth)){
                    skip = true;
                    break;
                }
            }
            if(skip){
                continue;
            }
            if(layerData.slice(i, i + originalSeqArray.length).every((v, idx) => v === originalSeqArray[idx])){
                layerData.splice(i, originalSeqArray.length, ...replaceSeqArray);
            }
        }
        return clonedArray === layerData;
    }

    rotateLayer90Degrees(layerData, layerWidth, layerHeight)
    {
        let newWidth = layerHeight;
        let newHeight = layerWidth;
        let rotatedMap = new Array(layerData.length).fill(0);
        for(let y = 0; y < layerHeight; y++){
            for(let x = 0; x < layerWidth; x++){
                let originalIndex = y * layerWidth + x;
                let rotatedX = y;
                let rotatedY = newHeight - x - 1;
                let rotatedIndex = rotatedX + rotatedY * newWidth;
                rotatedMap[rotatedIndex] = layerData[originalIndex];
            }
        }
        return rotatedMap;
    }

    rollbackRotation90Degrees(layerData, layerWidth, layerHeight)
    {
        let originalWidth = layerHeight; // the original width is the rotated height
        let originalHeight = layerWidth; // the original height is the rotated width
        let rotatedMap = new Array(layerData.length).fill(0);
        for(let y = 0; y < layerHeight; y++){
            for(let x = 0; x < layerWidth; x++){
                let rotatedIndex = y * layerWidth + x;
                let originalX = layerHeight - y - 1;
                let originalY = x;
                let originalIndex = originalY * originalWidth + originalX;
                rotatedMap[originalIndex] = layerData[rotatedIndex];
            }
        }
        return rotatedMap;
    }

    tileIndexByRowAndColumn(row, column)
    {
        return row * this.mapWidth + column;
    }

    isBorder(pathTilePosition)
    {
        return 0 >= pathTilePosition.x
            || 0 >= pathTilePosition.y
            || this.mapWidth === pathTilePosition.x
            || this.mapHeight === pathTilePosition.y;
    }

    async createLayerOuterWalls(bordersLayer, tilesKey, spotTiles, width, height, wallsLayer)
    {
        let outerWallsTiles = this.mapTilesShortcuts(tilesKey, spotTiles.p, null, '-outer-walls');
        let outerWallsLayer = Array(bordersLayer.length).fill(0);
        let mapper = new WallsMapper(spotTiles, outerWallsTiles);
        // this will be added to the tile index to place the tiles in the outerWallsLayer:
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

    applyPatternsThroughMerge(outerWallsLayer, bordersLayer, mapWidth, mapHeight, spotTiles, outerTiles)
    {
        // @TODO - BETA - Extract into outer walls patterns class.
        let mergedLayers = this.mergeLayers([...outerWallsLayer], [...bordersLayer]);
        let outerTc = sc.get(outerTiles, 'tC', 0);
        let { step1, step2, step3, step4, step5, step6, step7, step8 } = OuterWallsMerge.sequences(
            spotTiles,
            outerTiles,
            outerTc
        );
        this.replaceSequences(mergedLayers, step1, mapWidth);
        // rotate:
        mergedLayers = this.rotateLayer90Degrees(mergedLayers, mapWidth, mapHeight);
        this.replaceSequences(mergedLayers, step2, mapHeight);
        if(outerTc){
            this.replaceSequences(mergedLayers, step3, mapHeight);
        }
        // and rollback:
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

    applyOuterWallsPatterns(outerWallsLayer, mapWidth, mapHeight, spotTiles, outerTiles)
    {
        // @TODO - BETA - Extract into an OuterWallsPatterns class.
        let fixedLayer = [...outerWallsLayer];
        // fix patterns:
        let { step1, step2, step3, step4, step5 } = OuterWalls.sequences(spotTiles, outerTiles);
        this.replaceSequences(fixedLayer, step1, mapWidth);
        // fix loose corners:
        this.replaceCornersPatters(fixedLayer, mapWidth, spotTiles, outerTiles);
        // rotate:
        fixedLayer = this.rotateLayer90Degrees(fixedLayer, mapWidth, mapHeight);
        // fix rotated loose corners:
        this.replaceCornersPatters(fixedLayer, mapHeight, spotTiles, outerTiles);
        // fix rotated patterns:
        this.replaceSequences(fixedLayer, step2, mapHeight);
        // rotate back:
        fixedLayer = this.rollbackRotation90Degrees(fixedLayer, mapHeight, mapWidth);
        // fix remaining patters:
        this.replaceSequences(fixedLayer, step3, mapWidth);
        // rotate:
        fixedLayer = this.rotateLayer90Degrees(fixedLayer, mapWidth, mapHeight);
        this.replaceSequences(fixedLayer, step4, mapHeight);
        // rollback:
        fixedLayer = this.rollbackRotation90Degrees(fixedLayer, mapHeight, mapWidth);
        this.replaceSequences(fixedLayer, step5, mapWidth);
        return fixedLayer;
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

    isTopBorderTile(tile, spotTilesShortcuts)
    {
        return tile === spotTilesShortcuts.cTL || tile === spotTilesShortcuts.sTC || tile === spotTilesShortcuts.cTR;
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

    mergeLayers(layerA, layerB)
    {
        let mergedLayer = Array(layerA.length).fill(0);
        for(let i = 0; i < layerA.length; i++){
            if(0 !== layerB[i]){
                mergedLayer[i] = layerB[i];
            }
            if(0 === mergedLayer[i] && 0 !== layerA[i]){
                mergedLayer[i] = layerA[i];
            }
        }
        return mergedLayer;
    }

    connectedTiles(tileIndex, bordersLayer, layerWidth)
    {
        return {
            top: bordersLayer[tileIndex - layerWidth],
            down: bordersLayer[tileIndex + layerWidth],
            left: bordersLayer[tileIndex - 1],
            right: bordersLayer[tileIndex + 1]
        };
    }

    countConnected(tileConnections)
    {
        let top = 0 === tileConnections.top ? 0 : 1;
        let down = 0 === tileConnections.down ? 0 : 1;
        let left = 0 === tileConnections.left ? 0 : 1;
        let right = 0 === tileConnections.right ? 0 : 1;
        return {
            connections: [top, down, left, right],
            total: top + down + left + right
        };
    }

    mapTilesShortcuts(tilesKey, mainTile, propertiesMapper, suffix = '')
    {
        let tilesShortcuts = TilesShortcuts.fromPropertiesMappersList(
            tilesKey,
            mainTile,
            propertiesMapper,
            suffix,
            this.groundSpotsPropertiesMappers,
            this.optimizedMapFirstTileset
        );
        if(tilesShortcuts.pathTileReplacement){
            this.pathTile = tilesShortcuts.pathTileReplacement;
        }
        return tilesShortcuts;
    }

    populatePropertiesMapper(propertiesMapper, surroundingTiles = {}, corners = {})
    {
        if(!propertiesMapper){
            return propertiesMapper;
        }
        if(0 === Object.keys(surroundingTiles).length && propertiesMapper.surroundingTiles){
            surroundingTiles = propertiesMapper.surroundingTiles;
        }
        if(0 === Object.keys(corners).length && propertiesMapper.corners){
            corners = propertiesMapper.corners;
        }
        if(0 === Object.keys(propertiesMapper.surroundingTilesPosition).length){
            propertiesMapper.populateWithSurroundingTiles(surroundingTiles);
        }
        if(0 === Object.keys(propertiesMapper.cornersPosition).length){
            propertiesMapper.populateWithCornerTiles(corners);
        }
        return propertiesMapper;
    }

    randomCentralIndex(width, height, applyBorders)
    {
        let startX = applyBorders ? 1 : 0;
        let endX = applyBorders ? width - 2 : width - 1;
        let startY = applyBorders ? 1 : 0;
        let endY = applyBorders ? height - 2 : height - 1;
        let midX = Math.floor((endX - startX) / 2);
        let midY = Math.floor((endY - startY) / 2);
        let x = startX + midX;
        let y = startY + midY;
        return y * width + x;
    }

    get4Neighbors(index, width, height, applyBorders)
    {
        // returns 4-directional neighbors (up/down/left/right) for the given 1D index in a width x height grid
        let neighbors = [];
        let x = index % width;
        let y = Math.floor(index / width);
        let isUp = applyBorders ? y > 1 : y > 0;
        let isDown = applyBorders ? y < height - 2 : y < height - 1;
        let isLeft = applyBorders ? x > 1 : x > 0;
        let isRight = applyBorders ? x < width - 2 : x < width - 1;
        if(isUp){
            neighbors.push(index - width);
        }
        if(isDown){
            neighbors.push(index + width);
        }
        if(isLeft){
            neighbors.push(index - 1);
        }
        if(isRight){
            neighbors.push(index + 1);
        }
        return neighbors;
    }

}

module.exports.RandomMapGenerator = RandomMapGenerator;
