/**
 *
 * Reldens - Tile Map Generator
 *
 */

const { OptionsValidator } = require('./validator/options-validator');
const { PathFinder } = require('./path-finder/path-finder');
const { JsonFormatter } = require('./map/json-formatter');
const { ElementsProvider } = require('./generator/elements-provider');
const { PropertiesMapper } = require('./generator/properties-mapper');
const { MapDataMapper } = require('./map/data-mapper');
const { TilesShortcuts } = require('./map/tiles-shortcuts');
const { WangsetMapper } = require('./map/wangset-mapper');
const { FileHandler } = require('./files/file-handler');
const { Logger, sc } = require('@reldens/utils');

class RandomMapGenerator
{

    constructor(props)
    {
        this.optionsValidator = new OptionsValidator();
        this.pathFinder = new PathFinder();
        this.fileHandler = new FileHandler();
        this.propertiesMapper = new PropertiesMapper();
        this.mappedMapDataFromProvider = {};
        this.elementsProvider = null;
        this.generatedFloorData = {};
        this.mapCustomProperties = [];
        this.resetInstance(props);
    }

    resetInstance(props)
    {
        this.currentDate = sc.getDateForFileName();
        this.defaultMapName = 'random-map-' + this.currentDate;
        this.isReady = false;
        if(props && 0 < Object.keys(props).length){
            this.setOptions(props);
            this.isReady = this.validate();
        }
    }

    setOptions(options)
    {
        // required:
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
        this.minimumElementsFreeSpaceAround = sc.get(options, 'minimumElementsFreeSpaceAround', 1);
        this.elementsAllowPathsInFreeSpace = sc.get(options, 'elementsAllowPathsInFreeSpace', {});
        this.defaultElementsAllowPathsInFreeSpace = sc.get(options, 'defaultElementsAllowPathsInFreeSpace', true);
        this.debugPathsGrid = sc.get(options, 'debugPathsGrid', false);
        // optional:
        this.rootFolder = sc.get(options, 'rootFolder', __dirname);
        this.generatedFolder = sc.get(
            options,
            'generatedFolder',
            this.fileHandler.joinPaths(this.rootFolder, 'generated')
        );
        let mapName = sc.get(options, 'mapName', this.defaultMapName);
        this.mapName = mapName.replace('.json', '');
        let mapFileName = sc.get(options, 'mapFileName', this.mapName);
        if(-1 === mapFileName.indexOf('.json')){
            mapFileName += '.json';
        }
        this.mapFileName = mapFileName;
        this.mapFileFullPath = this.fileHandler.joinPaths(this.generatedFolder, this.mapFileName);
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
        this.allowPlacePathOverElementsFreeArea = sc.get(options, 'allowPlacePathOverElementsFreeArea', false);
        this.blockMapBorder = sc.get(options, 'blockMapBorder', false);
        this.borderLayer = this.blockMapBorder && 0 === this.borderTile;
        this.isBorderWalkable = sc.get(options, 'isBorderWalkable', false);
        this.entryPosition = sc.get(options, 'entryPosition', '');
        this.entryPositionFrom = sc.get(options, 'entryPositionFrom', '');
        this.entryPositionSize = sc.get(options, 'entryPositionSize', 0);
        this.freeSpaceTilesQuantity = sc.get(options, 'freeSpaceTilesQuantity', 0);
        if(1 > this.freeSpaceTilesQuantity && this.blockMapBorder){
            this.freeSpaceTilesQuantity = 1;
        }
        this.variableTilesPercentage = sc.get(options, 'variableTilesPercentage', 0);
        this.groundSpots = sc.get(options, 'groundSpots', {});
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
        this.nextLayerId = 0;
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapGrid = [];
        this.groundLayerData = [];
        this.pathLayerData = [];
        this.pathLayerProperties = [];
        this.mainPathStart = false;
        this.mainPathStartBorder = false;
        this.additionalLayers = [];
        this.staticLayers = [];
        this.groundVariationsLayerData = [];
        this.generatedChangePoints = {};
        this.generatedReturnPoints = {};
        this.totalStaticLayers = 1
            + (this.borderLayer ? 1 : 0)
            + (0 < this.variableTilesPercentage ? 1 : 0)
            + (null !== this.pathTile ? 1 : 0);
        this.hasAssociatedMap = false;
        this.debugLayerData = false;
        this.temporalBlockedPositionsToAvoidElements = [];
        this.generatedSpots = {};
        this.generateSpotsWithDepth = {};
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
        this.generateSpots();
        this.generateEmptyMap();
        this.populateCollisionsMapBorder();
        this.generateInitialPath();
        this.placeElements();
        // the grid to connect paths is created after the additional layers are created on the placeElements method
        this.connectPaths();
        // apply variations after all the elements are displayed in the current map:
        this.applyVariations();
        let layers = this.generateLayersList();
        this.writeDebugPathFinderFile(layers, 'test-path-finding-grid-');
        let mapNextLayerId = layers.length + 1;
        // map template:
        let map = this.createTiledMapObject(mapNextLayerId, layers);
        this.fileHandler.createFolder(this.generatedFolder);
        let result = this.fileHandler.copyFile(
            this.fileHandler.joinPaths(this.rootFolder, this.tileSheetPath),
            this.tileSheetName,
            this.generatedFolder
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
        await this.fileHandler.writeFile(this.mapFileFullPath, JsonFormatter.mapToJSON(map));
        this.cleanAutoGeneratedProcessMapFiles();
        Logger.info('Map file successfully generated: ' + this.mapName);
        // after the main map was created we can create the associated maps:
        return sc.deepJsonClone(map);
    }

    writeDebugPathFinderFile(layers, layerNamePrefix = 'test-')
    {
        if(!this.debugPathsGrid){
            return;
        }
        let layersCloned = [...layers].filter(layers => layers.name !== 'ground-variations');
        let nextLayerId = layersCloned.length + 1;
        layersCloned.push(this.generateLayerWithData(
            'path-finder-collisions',
            Object.values(this.debugLayerData),
            nextLayerId
        ));
        let testMapName = this.fileHandler.joinPaths(this.generatedFolder, layerNamePrefix + this.mapFileName);
        Logger.debug('Creating test map: ' + testMapName);
        let testMapObject = this.createTiledMapObject(
            nextLayerId++,
            layersCloned
        );
        this.fileHandler.writeFile(testMapName, JsonFormatter.mapToJSON(testMapObject));
    }

    createTiledMapObject(mapNextLayerId, layers)
    {
        return {
            backgroundcolor: this.mapBackgroundColor,
            compressionlevel: this.mapCompressionLevel,
            height: this.mapHeight,
            infinite: false,
            orientation: 'orthogonal',
            renderorder: 'right-down',
            tileheight: this.tileSize,
            tilewidth: this.tileSize,
            type: 'map',
            width: this.mapWidth,
            nextlayerid: mapNextLayerId,
            nextobjectid: 1,
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
        if(this.elementsProvider?.factor){
            factor = '-x' + this.elementsProvider.factor;
        }
        const fileExtensions = ['.png', '.json'];
        for(let extension of fileExtensions){
            let mapPath1 = this.mapFileFullPath.toString().replace('.json', '');
            let optimizedElementsFile = mapPath1.replace(this.mapName, filePrefix+this.mapName+fileSuffix+extension);
            let mapPath2 = this.mapFileFullPath.toString().replace('.json', '');
            let optimizedElementsFileFactor = mapPath2.replace(
                this.mapName,
                filePrefix+this.mapName+fileSuffix+factor+extension
            );
            if(this.fileHandler.exists(optimizedElementsFile)){
                this.fileHandler.removeByPath(optimizedElementsFile);
            }
            if(this.fileHandler.exists(optimizedElementsFileFactor)){
                this.fileHandler.removeByPath(optimizedElementsFileFactor);
            }
        }
        let folderFiles = this.fileHandler.readFolder(this.generatedFolder);
        for(let fileName of folderFiles){
            if(0 === fileName.indexOf(fileStarts)){
                this.fileHandler.removeByPath(this.fileHandler.joinPaths(this.generatedFolder, fileName));
            }
        }
    }

    generateLayersList()
    {
        let nextLayerId = 1;
        nextLayerId = this.generateInvisibleSpots(nextLayerId);
        this.staticLayers.push(this.generateLayerWithData('ground', this.groundLayerData, nextLayerId++));
        if(this.borderLayer){
            this.staticLayers.push(
                this.generateLayerWithData('collisions-map-border', this.borderLayer, nextLayerId++)
            );
        }
        if(0 < this.groundVariationsLayerData.length){
            this.staticLayers.push(
                this.generateLayerWithData('ground-variations', this.groundVariationsLayerData, nextLayerId++)
            );
        }
        if(this.pathLayerData){
            let pathLayer = this.generateLayerWithData('path', this.pathLayerData, nextLayerId++);
            pathLayer.properties = this.pathLayerProperties;
            this.staticLayers.push(pathLayer);
        }
        // reduce file size by merging layers between each element layer:
        let layers = [...this.mergeLayersByTileValue(this.staticLayers, this.additionalLayers)];
        // re-order layer to match spots specification (if any):
        layers = this.reorderLayersBasedOnSpots(layers);
        // reduce file size by removing fully empty layers:
        layers = layers.filter(layer => {
            return layer.data.some(tile => tile !== 0);
        });
        // reduce file size by merging layers using the auto-merge keys:
        Logger.debug('Total layers before merge: '+layers.length);
        if(0 < this.autoMergeLayersByKeys.length){
            for(let matchKey of this.autoMergeLayersByKeys){
                layers = this.mergeLayersByNameSubstring(layers, matchKey);
            }
        }
        Logger.debug('Total layers after merge: '+layers.length);
        return layers;
    }

    generateInvisibleSpots(nextLayerId)
    {
        let invisibleSpotsKeys = Object.keys(this.generatedSpots).filter(
            key => !this.generatedSpots[key].isElement && !this.generatedSpots[key].depth
        );
        for(let spotKey of invisibleSpotsKeys){
            let groundSpotConfig = this.generatedSpots[spotKey];
            if(!groundSpotConfig.spotLayers){
                continue;
            }
            for(let spotLayerKey of Object.keys(groundSpotConfig.spotLayers)){
                let spotLayerData = groundSpotConfig.spotLayers[spotLayerKey];
                let spotMapLayerData = Array(this.mapWidth * this.mapHeight).fill(0);
                let randomX = Math.floor(Math.random() * (this.mapWidth - groundSpotConfig.width));
                let randomY = Math.floor(Math.random() * (this.mapHeight - groundSpotConfig.height));
                for(let y = 0; y < groundSpotConfig.height; y++){
                    for(let x = 0; x < groundSpotConfig.width; x++){
                        let tileIndex = y * groundSpotConfig.width + x;
                        let isZeroTile = 0 === spotLayerData[tileIndex];
                        if(isZeroTile){
                            continue;
                        }
                        let gridX = randomX + x;
                        let gridY = randomY + y;
                        let mapIndex = gridY * this.mapWidth + gridX;
                        spotMapLayerData[mapIndex] = spotLayerData[tileIndex];
                    }
                }
                this.staticLayers.push(this.generateLayerWithData(spotLayerKey, spotMapLayerData, nextLayerId++));
            }
        }
        return nextLayerId++;
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
        for(let i = 0; i < spotKeys.length; i++) {
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

    generateInitialPath()
    {
        this.pathLayerData = Array(this.mapWidth * this.mapHeight).fill(0);
        // @NOTE: the main path is used as the starting point for the path to each element.
        this.placeMainPath();
    }

    generateEmptyMap()
    {
        let {mapWidth, mapHeight} = this.setMapSize();
        this.mapGrid = Array.from({length: mapHeight}, () => Array(mapWidth).fill(true));
        if(0 !== this.groundTile){
            // @TODO - BETA - If 0 < this.groundTiles.length then fill with random this.groundTiles.
            this.groundLayerData = Array(mapWidth * mapHeight).fill(this.groundTile);
        }
    }

    setMapSize()
    {
        if(0 < this.mapSize.mapWidth && 0 < this.mapSize.mapHeight){
            this.mapWidth = this.mapWidth.mapWidth;
            this.mapHeight = this.mapSize.mapHeight;
            return this.mapSize;
        }
        let {mapWidth, mapHeight} = this.calculateMapSizeWithFreeSpace();
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        return {mapWidth, mapHeight};
    }

    generateLayerWithData(layerName, layerData, nextLayerId)
    {
        return {
            id: nextLayerId,
            data: layerData,
            height: this.mapHeight,
            width: this.mapWidth,
            name: layerName,
            type: 'tilelayer',
            visible: true,
            opacity: 1,
            x: 0,
            y: 0
        };
    }

    /**
     * @NOTE: all these parameters are not been passed at any point in the generator, are optional for code extension.
     */
    calculateMapSizeWithFreeSpace(
        layerElements = false,
        elementsQuantity = false,
        freeSpaceTilesQuantity = false,
        elementsFreeSpaceAround = false
    ) {
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
        // calculate total area required by elements, including free space:
        for(let elementType of Object.keys(elementsQuantity)){
            let element = this.fetchFirstTilesLayer(layerElements[elementType]);
            if(!element){
                Logger.error('Element "tilelayer" not found: ' + elementType);
                continue;
            }
            let quantity = elementsQuantity[elementType];
            let freeSpaceAround = this.determineElementFreeSpaceAround(elementType, elementsFreeSpaceAround);
            let freeSpaceUpDownLeftRight = freeSpaceAround * 2;
            let freeTilesUpDownLeftRight = freeSpaceTilesQuantity * 2;
            let widthPlusFreeTiles = element.width + freeTilesUpDownLeftRight + freeSpaceUpDownLeftRight;
            let heightPlusFreeTiles = element.height + freeTilesUpDownLeftRight + freeSpaceUpDownLeftRight;
            let elementArea = widthPlusFreeTiles * heightPlusFreeTiles * quantity;
            totalArea += elementArea;
            // track max width and height for single largest element with free space:
            maxWidth = Math.max(maxWidth, widthPlusFreeTiles);
            maxHeight = Math.max(maxHeight, heightPlusFreeTiles);
        }
        // estimate square root of total area to get a base size for width and height:
        let baseSize = Math.ceil(Math.sqrt(totalArea));
        // ensure the base size is at least as large as the largest element's width or height:
        baseSize = Math.max(baseSize, maxWidth, maxHeight);
        // adjust baseSize to ensure it can accommodate the largest element's width or height:
        let mapWidth = baseSize;
        let mapHeight = baseSize;
        return { mapWidth, mapHeight };
    }

    determineElementFreeSpaceAround(elementType, elementsFreeSpaceAround)
    {
        if(!sc.isObject(elementsFreeSpaceAround)){
            if(!sc.isObject(this.elementsFreeSpaceAround)){
                return this.minimumElementsFreeSpaceAround;
            }
            elementsFreeSpaceAround = this.elementsFreeSpaceAround;
        }
        return sc.get(elementsFreeSpaceAround, elementType, this.minimumElementsFreeSpaceAround);
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
            return;
        }
        let layer = this.additionalLayers[layerIndex];
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
            return [];
        }
        // @NOTE: since the free space around could be more than 1 tile, we need to block all the free tiles until we
        // reach the elements and all the free tiles after the element.
        for(let i = 1; i <= freeSpaceAround; i++){
            let previousTileY = gridY - freeSpaceAround;
            let previousTileX = gridX - freeSpaceAround;
            let nextTileY = gridY + freeSpaceAround;
            let nextTileX = gridX + freeSpaceAround;
            let savePoint = {previousTileY, previousTileX, nextTileY, nextTileX, elementName, allowPathsInFreeSpace};
            if(-1 === this.temporalBlockedPositionsToAvoidElements.indexOf(savePoint)){
                this.markMapGridPosition(previousTileY, previousTileX, false);
                this.markMapGridPosition(previousTileY, nextTileX, false);
                this.markMapGridPosition(nextTileY, previousTileX, false);
                this.markMapGridPosition(nextTileY, nextTileX, false);
                this.temporalBlockedPositionsToAvoidElements.push(savePoint);
            }
        }
    }

    markMapGridPosition(tileY, tileX, walkable)
    {
        if(0 > tileY || !sc.hasOwn(this.mapGrid, tileY)){
            if(0 < tileY){
                Logger.debug('None tileY in mapGrid: '+tileY);
            }
            return;
        }
        if(0 > tileX || !sc.hasOwn(this.mapGrid[tileY], tileX)){
            if(0 < tileX){
                Logger.debug('None tileX in tileY: '+tileX);
            }
            return;
        }
        this.mapGrid[tileY][tileX] = walkable;
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
        // when the elements name is indexOf 'stairs-' then we need to look up for the stairs number property
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

    placeElements()
    {
        this.generateAdditionalLayers();
        this.prePlaceStairs();
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

    generateAdditionalLayers()
    {
        let addedLayerNames = new Set();
        this.nextLayerId = this.totalStaticLayers;
        for(let elementType of Object.keys(this.layerElements)){
            for(let layer of this.layerElements[elementType]){
                // check layer visibility
                if(!layer.visible){
                    Logger.warning('Layer "'+layer.name+'" not visible.');
                    continue;
                }
                // check if layer name is unique
                if(!addedLayerNames.has(layer.name)){
                    // fill layer with empty tiles:
                    let layerData = Array(this.mapWidth * this.mapHeight).fill(0);
                    this.additionalLayers.push(this.generateLayerWithData(layer.name, layerData, this.nextLayerId++));
                    // mark this layer name as added:
                    addedLayerNames.add(layer.name);
                }
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
            // update each layer with the elements tiles at the determined position:
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
        for(let y=0; y < this.mapHeight; y++){
            for(let x=0; x < this.mapWidth; x++){
                if(this.canPlaceElement(x, y , elementWidth, elementHeight)){
                    return {x, y};
                }
            }
        }
        return null;
    }

    findRandomPosition(width, height)
    {
        let maxTries = 200;
        let tries = 0;
        while (tries < maxTries){
            let x = Math.floor(Math.random() * (this.mapWidth - width));
            let y = Math.floor(Math.random() * (this.mapHeight - height));
            if(this.canPlaceElement(x, y, width, height)){
                return { x, y };
            }
            tries++;
        }
        return null;
    }

    canPlaceElement(x, y, width, height)
    {
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
        this.groundVariationsLayerData = Array(this.mapWidth * this.mapHeight).fill(0);
        let totalTiles = this.pathLayerData.filter(tile => tile === 0).length;
        let tilesToChange = Math.floor(totalTiles * (this.variableTilesPercentage / 100));
        for(let i = 0, applied = 0; applied < tilesToChange && i < totalTiles * 2; i++){
            let x = Math.floor(Math.random() * this.mapWidth);
            let y = Math.floor(Math.random() * this.mapHeight);
            let position = y * this.mapWidth + x;
            if(0 === this.pathLayerData[position]){
                this.groundVariationsLayerData[position] = this.randomGroundTiles[
                    Math.floor(Math.random() * this.randomGroundTiles.length)
                ];
                applied++;
            }
        }
    }

    placeMainPath()
    {
        if(0 < this.previousMainPath.length){
            this.generateOppositeMainPath();
        }
        if(0 === this.generatedMainPathIndexes.length){
            this.generateRandomMainPath();
        }
        if(0 < this.generatedMainPathIndexes.length){
            for(let mainPathPoint of this.generatedMainPathIndexes){
                let {index, y, x} = mainPathPoint;
                let result = this.placeMainPathIndex(index, y, x);
                if(!result){
                    return false;
                }
            }
            if(!this.generatedReturnPoints['default-main-path']){
                let {returnPointX, returnPointY, position} = this.determineReturnPointFromMainPath();
                let returnPointIndex = this.provideReturnIndexByPosition(returnPointX, returnPointY);
                this.generatedReturnPoints['default-main-path'] = {
                    mapIndex: returnPointIndex,
                    x: returnPointX,
                    y: returnPointY,
                    position
                };
                let prefix = 'return-point-';
                let pointName = this.mapName;
                let type = 'int';
                this.pathLayerProperties.push(
                    {name: prefix+'for-default-'+pointName, type, value: returnPointIndex},
                    {name: prefix+'x-'+pointName, type, value: returnPointX},
                    {name: prefix+'y-'+pointName, type, value: returnPointY},
                    {name: prefix+'position-'+pointName, type: 'string', value: position}
                );
            }
        }
        if(0 < this.generatedMainPathIndexesBorder.length){
            Logger.debug('Main path tiles.', this.generatedMainPathIndexesBorder, this.generatedMainPathIndexes);
            for(let mainPathPointBorder of this.generatedMainPathIndexesBorder){
                this.pathLayerData[mainPathPointBorder.index] = this.pathTile;
            }
        }
    }

    determineReturnPointFromMainPath()
    {
        let position = 'down';
        // use index 1 to prevent the map border:
        let path = this.generatedMainPathIndexes[1] || this.generatedMainPathIndexes[0];
        if(!path){
            Logger.warning('Could not determine return point from main path.', this.generatedMainPathIndexes);
            return {returnPointX: 1, returnPointY: 1, position};
        }
        if(!this.blockMapBorder){
            return {returnPointX: path.x, returnPointY: path.y, position};
        }
        let returnPointX = 0 === path.x ? path.x + 1 : path.x;
        if(path.x === this.mapWidth - 1){
            returnPointX = this.mapWidth - 2; // -2 to prevent the map border and consider the player size
        }
        let returnPointY = 0 === path.y ? path.x + 1 : path.y;
        if(path.y === this.mapHeight - 1){
            returnPointY = this.mapHeight - 2; // -2 to prevent the map border and consider the player size
            position = 'up';
        }
        return {returnPointX, returnPointY, position};
    }

    generateRandomMainPath()
    {
        if(0 === this.mainPathSize){
            return;
        }
        let randomEdge = Math.floor(Math.random() * 4);
        let randomStartX = Math.floor(Math.random() * (this.mapWidth - this.mainPathSize));
        let randomStartY = Math.floor(Math.random() * (this.mapHeight - this.mainPathSize));
        let borderPathData = this.generateFullMainPathWithIndexes(0, randomEdge, randomStartX, randomStartY);
        if(this.isBorderWalkable){
            this.mainPathStart = borderPathData.mainPathStart;
            this.generatedMainPathIndexes = borderPathData.generatedPathIndexes;
            return;
        }
        let notWalkableBorderPathData = this.generateFullMainPathWithIndexes(1, randomEdge, randomStartX, randomStartY);
        this.mainPathStart = notWalkableBorderPathData.mainPathStart;
        this.generatedMainPathIndexes = notWalkableBorderPathData.generatedPathIndexes;
        this.mainPathStartBorder = borderPathData.mainPathStart;
        this.generatedMainPathIndexesBorder = borderPathData.generatedPathIndexes;
    }

    generateFullMainPathWithIndexes(walkableBorder, randomEdge, randomStartX, randomStartY)
    {
        let firstWalkable = 0 + walkableBorder;
        let mainPathStart = {x: firstWalkable, y: firstWalkable};
        let lastWalkable = 1 + walkableBorder;
        // randomly choose an edge (top=0, right=1, bottom=2, left=3):
        switch(randomEdge){
            case 0: // top edge
                mainPathStart.x = randomStartX;
                mainPathStart.y = firstWalkable;
                break;
            case 1: // right edge
                mainPathStart.x = this.mapWidth - lastWalkable;
                mainPathStart.y = randomStartY;
                break;
            case 2: // bottom edge
                mainPathStart.x = randomStartX;
                mainPathStart.y = this.mapHeight - lastWalkable;
                break;
            case 3: // left edge
                mainPathStart.x = firstWalkable;
                mainPathStart.y = randomStartY;
                break;
        }
        let generatedPathIndexes = [];
        for(let i = 0; i < this.mainPathSize; i++){
            let x = mainPathStart.x;
            let y = mainPathStart.y;
            let plusOnX = firstWalkable === mainPathStart.y || mainPathStart.y === this.mapHeight - lastWalkable;
            // top or bottom edge
            x += (plusOnX ? i : 0);
            // right or left edge
            y += (plusOnX ? 0 : i);
            let index = y * this.mapWidth + x;
            let mainPathIndexData = {index, x, y};
            generatedPathIndexes.push(mainPathIndexData);
        }
        return {mainPathStart, generatedPathIndexes};
    }

    generateOppositeMainPath()
    {
        let previousPathMiddleTile = Math.ceil(this.previousMainPath.length / 2);
        let referenceY = this.previousMainPath[previousPathMiddleTile].y;
        let shouldFlipVertically = 0 === referenceY || this.mapHeight - 1 === referenceY;
        this.generatedMainPathIndexes = [];
        for(let i = 0; i < this.previousMainPath.length; i++){
            let x = this.previousMainPath[i].x;
            if(!shouldFlipVertically){
                x = 0 === x ? this.mapWidth - 1 : 0;
            }
            let y = this.previousMainPath[i].y;
            if(shouldFlipVertically){
                y = 0 === y ? this.mapHeight - 1 : 0;
            }
            let index = y * this.mapWidth + x;
            this.generatedMainPathIndexes.push({index, x, y});
        }
        this.hasAssociatedMap = true;
    }

    placeMainPathIndex(index, y, x)
    {
        try {
            this.pathLayerData[index] = this.pathTile;
            // mark as occupied:
            this.mapGrid[y][x] = false;
        } catch (error) {
            Logger.critical('Could not place main path tile.', index, y, x, error);
            return false;
        }
        return true;
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
        if(this.mapWidth - 1 === x) {
            return this.mapWidth - 2;
        }
        return x;
    }

    populateCollisionsMapBorder()
    {
        if(!this.borderLayer){
            return false;
        }
        this.borderLayer = Array(this.mapWidth * this.mapHeight).fill(0);
        let borderTile = this.borderTile || this.groundTile;
        for(let x = 0; x < this.mapWidth; x++){
            // top border:
            this.borderLayer[x] = this.bordersTiles['top'] || borderTile;
            // bottom border:
            this.borderLayer[(this.mapHeight-1) * this.mapWidth+x] = this.bordersTiles['bottom'] || borderTile;
        }
        for(let y = 0; y < this.mapHeight; y++){
            // left border:
            this.borderLayer[y * this.mapWidth] = this.bordersTiles['left'] || borderTile;
            // right border:
            this.borderLayer[y * this.mapWidth + (this.mapWidth - 1)] = this.bordersTiles['right'] || borderTile;
        }
        if(this.validateBorderCorners()){
            this.borderLayer[0] = this.bordersTiles['top-left'];
            this.borderLayer[this.mapWidth - 1] = this.bordersTiles['top-right'];
            this.borderLayer[(this.mapHeight - 1) * this.mapWidth] = this.bordersTiles['bottom-left'];
            this.borderLayer[(this.mapHeight - 1) * this.mapWidth + this.mapWidth - 1] = this.bordersTiles['bottom-right'];
        }
        if(!this.isBorderWalkable){
            this.markBorderAsNotWalkable();
        }
        this.createEntryPosition();
    }

    createEntryPosition()
    {
        if('' === this.entryPosition) {
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
        if(null === x || null === y) {
            Logger.critical('Invalid entry position data.', {entryPosition: this.entryPosition, x, y});
            return;
        }
        let returnToMainMapChangePointLayer = Array(this.mapWidth * this.mapHeight).fill(0);
        let layerProperties = [];
        for(let i = 0; i < this.entryPositionSize; i++) {
            // mark the entry position with 0 in the border layer:
            let mapIndex = y * this.mapWidth + x + i;
            this.borderLayer[mapIndex] = 0;
            // marking the mapGrid position as walkable
            this.mapGrid[y][x + i] = true;
            returnToMainMapChangePointLayer[mapIndex] = this.groundTile;
            if(this.entryPositionFrom) {
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
        let generatedLayer = this.generateLayerWithData(
            'return-to-main-map-change-points',
            returnToMainMapChangePointLayer,
            this.nextLayerId++
        );
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
        // @TODO - BETA - Include directions left and right.
        if(direction === 'top') {
            y = 0;
            yReturn = 1;
        }
        if(direction === 'down') {
            y = this.mapHeight - 1;
            yReturn = this.mapHeight - 2;
            returnPointPosition = 'up';
        }
        if(position === 'left') {
            x = 1; // 1 instead of 0, since 0 is the vertical wall
        }
        if(position === 'middle') {
            // map width / 2 - entry position size / 2 to get the entry position in the middle:
            x = Math.floor(this.mapWidth / 2) - Math.floor(this.entryPositionSize / 2);
        }
        if(position === 'right') {
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

    markBorderAsNotWalkable()
    {
        // mark the border as occupied in the mapGrid
        for(let x = 0; x < this.mapWidth; x++){
            this.mapGrid[0][x] = false;
            this.mapGrid[this.mapHeight - 1][x] = false;
        }
        for(let y = 0; y < this.mapHeight; y++){
            this.mapGrid[y][0] = false;
            this.mapGrid[y][this.mapWidth - 1] = false;
        }
    }

    mergeLayersByTileValue(staticLayers, additionalLayers)
    {
        let combinedLayers = [...staticLayers, ...additionalLayers];
        // use a map to track merged layers by name:
        let mergedLayersByName = new Map();
        for(let layer of combinedLayers){
            // @TODO - Include convention to check on "merge-#" in layers names and merge them to reduce the file size.
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

    findPathTilePositions(layerData)
    {
        let tilesFound = []
        for(let y = 0; y < this.mapHeight; y++){
            for(let x = 0; x < this.mapWidth; x++){
                let index = y * this.mapWidth + x;
                if(layerData[index] === this.pathTile){
                    tilesFound.push({ x, y });
                }
            }
        }
        return tilesFound;
    }

    isBorder(pathTilePosition)
    {
        return 0 >= pathTilePosition.x
            || 0 >= pathTilePosition.y
            || this.mapWidth === pathTilePosition.x
            || this.mapHeight === pathTilePosition.y;
    }

    connectPaths()
    {
        if(!this.generateElementsPath){
            return false;
        }
        let grid = this.createPathfindingGrid();
        let allPathsPoints = [];
        let pathLayers = this.additionalLayers.filter(layer => 'path' === layer.name);
        // ensure main path is walkable:
        if(this.mainPathStart){
            grid.setWalkableAt(this.mainPathStart.x, this.mainPathStart.y, true);
        }
        for(let layer of pathLayers){
            let pathTilePositions = this.findPathTilePositions(layer.data);
            for(let i = 0; i < pathTilePositions.length; i++){
                let pathTilePosition = pathTilePositions[i];
                if(this.isBorder(pathTilePosition)){
                    continue;
                }
                // ensure path tile position is walkable:
                grid.setWalkableAt(pathTilePosition.x, pathTilePosition.y, true);
                let endPathTilePosition = this.fetchEndPathTilePosition(pathTilePositions);
                let path = this.findPathToAvailablePoints(
                    pathTilePosition,
                    endPathTilePosition,
                    pathTilePositions,
                    grid
                );
                if(0 === path.length){
                    continue;
                }
                for(let point of path){
                    // ensure all path points are walkable:
                    grid.setWalkableAt(point[0], point[1], true);
                    // mark the path:
                    let pointIndex = point[1] * this.mapWidth + point[0];
                    this.pathLayerData[pointIndex] = this.pathTile;
                    allPathsPoints.push(point);
                }
            }
        }
        // after created all the paths, now we can mark the paths in the grid to not be used anymore by other elements:
        for(let point of allPathsPoints){
            this.mapGrid[point[1]][point[0]] = false; // mark as occupied / unusable for anything else
        }
        if(!this.applySurroundingPathTiles){
            return;
        }
        // @TODO - BETA - Refactor to use the tiled map editor terrains ("wangsets") type "corner" and "wangtiles".
        // shortcuts:
        this.pathLayerData = this.applyBordersAndCornersTiles(
            this.pathLayerData,
            this.mapWidth,
            this.mapHeight,
            this.tilesShortcuts
        );
        // clean up map borders:
        this.cleanUpMapBorders();
    }

    applyBordersAndCornersTiles(layerData, mapWidth, mapHeight, tilesShortcuts)
    {
        let {p, sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = tilesShortcuts;
        layerData = this.applyRotationToCompletePathGrid(tilesShortcuts.p, layerData, mapWidth, mapHeight);
        // this has to happen in sequence to not mess up the rotation:
        this.replaceSequence(layerData, [p, '0', p].join(','), [p, p, p].join(','), mapWidth);
        this.replaceSequence(layerData, ['0', p].join(','), [sML, p].join(','), mapWidth);
        this.replaceSequence(layerData, [p, '0'].join(','), [p, sMR].join(','), mapWidth);
        // rotate the path:
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequence(layerData, [p, '0', p].join(','), [p, p, p].join(','), mapHeight);
        this.replaceSequence(layerData, ['0', p].join(','), [sTC, p].join(','), mapHeight);
        this.replaceSequence(layerData, [p, '0'].join(','), [p, sBC].join(','), mapHeight);
        // rollback rotation:
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        // add corners:
        this.replaceSequence(layerData, ['0', sTC].join(','), [sTL, sTC].join(','), mapWidth);
        this.replaceSequence(layerData, [sTC, '0'].join(','), [sTC, sTR].join(','), mapWidth);
        this.replaceSequence(layerData, ['0', sBC].join(','), [sBL, sBC].join(','), mapWidth);
        this.replaceSequence(layerData, [sBC, '0'].join(','), [sBC, sBR].join(','), mapWidth);
        this.replaceSequence(layerData, [sBC, sML].join(','), [sBC, cBL].join(','), mapWidth);
        this.replaceSequence(layerData, [sTC, sML].join(','), [sTC, cTL].join(','), mapWidth);
        this.replaceSequence(layerData, [sMR, sBC].join(','), [cBR, sBC].join(','), mapWidth);
        this.replaceSequence(layerData, [sMR, sTC].join(','), [cTR, sTC].join(','), mapWidth);
        // rotate to add upper corners:
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequence(layerData, [sML, '0'].join(','), [sML, sBL].join(','), mapHeight);
        this.replaceSequence(layerData, ['0', sML].join(','), [sTL, sML].join(','), mapHeight);
        this.replaceSequence(layerData, [cBR, '0'].join(','), [cBR, sBL].join(','), mapHeight);
        this.replaceSequence(layerData, [sMR, '0'].join(','), [sMR, sBR].join(','), mapHeight);
        this.replaceSequence(layerData, [sMR, p].join(','), [cTR, p].join(','), mapHeight);
        this.replaceSequence(layerData, [p, sMR].join(','), [p, cBR].join(','), mapHeight);
        this.replaceSequence(layerData, [p, sML].join(','), [p, cBL].join(','), mapHeight);
        this.replaceSequence(layerData, [sML, p].join(','), [cTL, p].join(','), mapHeight);
        this.replaceSequence(layerData, ['0', sMR].join(','), [sTR, sMR].join(','), mapHeight);
        this.replaceSequence(layerData, [cBL, '0'].join(','), [cBL, sBL].join(','), mapHeight);
        this.replaceSequence(layerData, ['0', cBL].join(','), [sTR, cBL].join(','), mapHeight);
        this.replaceSequence(layerData, ['0', cTL].join(','), [sTL, cTL].join(','), mapHeight);
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        // restore rotation and fix round corners:
        this.replaceSequence(layerData, [sMR, sBL].join(','), [cBR, sBL].join(','), mapWidth);
        this.replaceSequence(layerData, [sTL, sML].join(','), [sTL, cTL].join(','), mapWidth);
        this.replaceSequence(layerData, [sMR, sBR].join(','), [cBR, sBR].join(','), mapWidth);
        this.replaceSequence(layerData, [sBL, sML].join(','), [sBL, cBL].join(','), mapWidth);
        this.replaceSequence(layerData, [sMR, sTR].join(','), [cTR, sTR].join(','), mapWidth);
        this.replaceSequence(layerData, [cTR, '0'].join(','), [cTR, sTR].join(','), mapWidth);
        this.replaceSequence(layerData, [cTR, p].join(','), [p, p].join(','), mapWidth);
        this.replaceSequence(layerData, [p, cBL].join(','), [p, p].join(','), mapWidth);
        this.replaceSequence(layerData, [cTR, cBL].join(','), [p, p].join(','), mapWidth);
        this.replaceSequence(layerData, [cBR, sBL].join(','), [cBR, sBR].join(','), mapWidth);
        return layerData;
    }

    unblockTemporalBlockedPoints(temporalBlockedPositionsToAvoidElements, grid)
    {
        let filteredPoints = temporalBlockedPositionsToAvoidElements.filter(point => point.allowPathsInFreeSpace);
        //Logger.debug('Unblock temporal blocked points.', filteredPoints);
        for(let positionPoints of filteredPoints){
            let {previousTileY, previousTileX, nextTileY, nextTileX} = positionPoints;
            this.markMapGridPosition(previousTileY, previousTileX, true);
            this.markMapGridPosition(previousTileY, nextTileX, true);
            this.markMapGridPosition(nextTileY, previousTileX, true);
            this.markMapGridPosition(nextTileY, nextTileX, true);
        }
        return grid;
    }

    findPathToAvailablePoints(pathTilePosition, endPathTilePosition, pathTilePositions, grid)
    {
        let path = this.pathFinder.findPath(
            pathTilePosition,
            endPathTilePosition,
            grid
        );
        if(0 < path.length){
            Logger.debug('Path found for "endPathTilePosition".', {
                pathTilePosition: pathTilePosition ? grid.isWalkableAt(pathTilePosition.x, pathTilePosition.y) : false,
                walkableEndPathTilePosition: endPathTilePosition
                    ? grid.isWalkableAt(endPathTilePosition.x, endPathTilePosition.y)
                    : false
            });
            return path;
        }
        if(0 === path.length){
            Logger.debug('Path not found, retrying over "pathTilePositions".');
            let filteredPositions = pathTilePositions.filter(position => position !== pathTilePosition);
            for(let differentPathTilePosition of filteredPositions){
                path = this.pathFinder.findPath(
                    pathTilePosition,
                    differentPathTilePosition,
                    grid
                );
                Logger.debug('Retrying position.', {
                    pathTilePosition,
                    walkablePathTilePosition: grid.isWalkableAt(pathTilePosition.x, pathTilePosition.y),
                    differentPathTilePosition,
                    walkablePoint: grid.isWalkableAt(differentPathTilePosition.x, differentPathTilePosition.y),
                    path
                });
                if(0 < path.length){
                    Logger.debug('Path found after retry on position.', differentPathTilePosition);
                    return path;
                }
            }
        }
        Logger.warning('Path not found, check walkable points.');
        return path;
    }

    fetchEndPathTilePosition(pathTilePositions, pathTilePosition)
    {
        if(this.mainPathStart){
            return this.mainPathStart
        }
        if(sc.isArray(pathTilePositions)){
            return pathTilePositions[0];
        }
        return pathTilePosition;
    }

    applyRotationToCompletePathGrid(pathTile, layerData, mapWidth, mapHeight)
    {
        let singleSpace = [pathTile, 0, pathTile].join(',');
        let singleReplace = [pathTile, pathTile, pathTile].join(',');
        let doubleSpace = [pathTile, 0, 0, pathTile].join(',');
        let doubleReplace = [pathTile, pathTile, pathTile, pathTile].join(',');
        while (true) {
            this.replaceSequence(layerData, doubleSpace, doubleReplace, mapWidth);
            let applyHorizontalChanges = this.replaceSequence(layerData, singleSpace, singleReplace, mapWidth);
            layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
            this.replaceSequence(layerData, doubleSpace, doubleReplace, mapHeight);
            let applyVerticalChanges = this.replaceSequence(layerData, singleSpace, singleReplace, mapHeight);
            layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
            if(!applyHorizontalChanges && !applyVerticalChanges){
                break;
            }
        }
        return layerData;
    }

    replaceSequence(array, originalSequence, replaceSequence, mapWidth)
    {
        let clonedArray = [...array];
        let originalSeqArray = originalSequence.split(',').map(Number);
        let replaceSeqArray = replaceSequence.split(',').map(Number);
        for(let i = 0; i <= array.length - originalSeqArray.length; i++){
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
            if(array.slice(i, i + originalSeqArray.length).every((v, idx) => v === originalSeqArray[idx])){
                array.splice(i, originalSeqArray.length, ...replaceSeqArray);
            }
        }
        return clonedArray === array;
    }

    rotateLayer90Degrees(layerData, originalWidth, originalHeight)
    {
        const newWidth = originalHeight;
        const newHeight = originalWidth;
        const rotatedMap = new Array(layerData.length).fill(0);
        for(let y = 0; y < originalHeight; y++) {
            for(let x = 0; x < originalWidth; x++) {
                const originalIndex = y * originalWidth + x;
                const rotatedX = y;
                const rotatedY = newHeight - x - 1;
                const rotatedIndex = rotatedX + rotatedY * newWidth;
                rotatedMap[rotatedIndex] = layerData[originalIndex];
            }
        }

        return rotatedMap;
    }

    rollbackRotation90Degrees(rotatedMap, rotatedWidth, rotatedHeight)
    {
        const originalWidth = rotatedHeight; // the original width is the rotated height
        const originalHeight = rotatedWidth; // the original height is the rotated width
        const originalMap = new Array(rotatedMap.length).fill(0);
        for(let y = 0; y < rotatedHeight; y++) {
            for(let x = 0; x < rotatedWidth; x++) {
                const rotatedIndex = y * rotatedWidth + x;
                const originalX = rotatedHeight - y - 1;
                const originalY = x;
                const originalIndex = originalY * originalWidth + originalX;
                originalMap[originalIndex] = rotatedMap[rotatedIndex];
            }
        }

        return originalMap;
    }

    cleanUpMapBorders()
    {
        let {sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR} = this.tilesShortcuts;
        let rowTopInvalidValues = [sBL, sBC, sBR];
        let rowBottomInvalidValues = [sTL, sTC, sTR];
        let rowLeftInvalidValue = [sTR, sMR, sBR];
        let rowRightInvalidValue = [sTL, sML, sBL];
        for(let c = 0; c < this.mapWidth; c++){
            let currentTopValue = this.pathLayerData[this.tileIndexByRowAndColumn(0, c)];
            if(-1 !== rowTopInvalidValues.indexOf(currentTopValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(0, c)] = 0;
            }
            let currentBottomValue = this.pathLayerData[this.tileIndexByRowAndColumn(this.mapHeight - 1, c)];
            if(-1 !== rowBottomInvalidValues.indexOf(currentBottomValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(this.mapHeight - 1, c)] = 0;
            }
        }
        for(let r = 0; r < this.mapHeight; r++){
            let currentLeftValue = this.pathLayerData[this.tileIndexByRowAndColumn(r, 0)];
            if(-1 !== rowLeftInvalidValue.indexOf(currentLeftValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(r, 0)] = 0;
            }
            let currentRightValue = this.pathLayerData[this.tileIndexByRowAndColumn(r, this.mapWidth - 1)];
            if(-1 !== rowRightInvalidValue.indexOf(currentRightValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(r, this.mapWidth - 1)] = 0;
            }
        }
    }

    createPathfindingGrid()
    {
        this.debugLayerData = {};
        let grid = this.pathFinder.create(this.mapWidth, this.mapHeight);
        this.unblockTemporalBlockedPoints(this.temporalBlockedPositionsToAvoidElements, grid);
        for(let layer of this.additionalLayers){
            let isCollisionsLayer = false;
            for(let collisionLayer of this.collisionLayersForPaths){
                if(-1 !== layer.name.indexOf(collisionLayer)){
                    isCollisionsLayer = true;
                }
            }
            for(let y = 0; y < this.mapHeight; y++){
                for(let x = 0; x < this.mapWidth; x++){
                    let tileIndex = this.tileIndexByRowAndColumn(y, x);
                    if(!this.mapGrid[y][x]){
                        grid.setWalkableAt(x, y, false);
                        this.debugLayerData[tileIndex] = 2;
                        continue;
                    }
                    let tile = layer.data[tileIndex];
                    let isZeroTile = 0 === Number(tile);
                    let isCollisionBody = !isZeroTile && isCollisionsLayer;
                    let hasBody = !isZeroTile && isCollisionBody;
                    if(!hasBody){
                        this.debugLayerData[tileIndex] = 0;
                        continue;
                    }
                    grid.setWalkableAt(x, y, false);
                    this.debugLayerData[tileIndex] = 2;
                }
            }
        }
        return grid;
    }

    tileIndexByRowAndColumn(row, column)
    {
        return row * this.mapWidth + column;
    }

    generateSpots()
    {
        for(let spotKey of Object.keys(this.groundSpots)){
            let groundSpotConfig = this.groundSpots[spotKey];
            let spotsQuantity = Number(sc.get(groundSpotConfig, 'quantity', 1));
            if(0 === spotsQuantity){
                Logger.warning('Ground spot was set with quantity 0.', groundSpotConfig);
                continue;
            }
            let addCollisions = !groundSpotConfig.walkable ? '-collisions' : '';
            let layerName = sc.get(groundSpotConfig, 'layerName', 'ground-spot-'+spotKey)+addCollisions;
            let tilesKey = sc.get(groundSpotConfig, 'surroundingTilesPrefix', spotKey);
            let spotTile = sc.get(
                groundSpotConfig,
                'spotTile',
                sc.get(this.elementsProvider.groundSpots, tilesKey, this.pathTile)
            );
            this.populatePropertiesMapper(this.elementsProvider.groundSpotsPropertiesMappers[tilesKey]);
            let spotTilesShortcuts = this.mapTilesShortcuts(
                tilesKey,
                spotTile,
                this.elementsProvider.groundSpotsPropertiesMappers[tilesKey]
            );
            // the spotTile can be overridden in the tile shortcuts with the main tile from the wangset:
            if('' !== spotTilesShortcuts.p && spotTile !== spotTilesShortcuts.p){
                spotTile = spotTilesShortcuts.p;
            }
            let spotLayers = {};
            for(let i = 0; i < spotsQuantity; i++){
                let spotLayer = this.createSpotLayer(
                    groundSpotConfig.width,
                    groundSpotConfig.height,
                    groundSpotConfig.markPercentage,
                    spotTile,
                    groundSpotConfig.applyCornersTiles
                );
                if(groundSpotConfig.applyCornersTiles){
                    spotLayer = this.applyBordersAndCornersTiles(
                        spotLayer,
                        groundSpotConfig.width,
                        groundSpotConfig.height,
                        spotTilesShortcuts
                    );
                }
                let layerKey = layerName+'-s'+i;
                spotLayers[layerKey] = spotLayer;
                if(groundSpotConfig.isElement){
                    this.layerElements[layerKey] = [{
                        height: groundSpotConfig.height,
                        name: layerKey,
                        opacity: 1,
                        type: 'tilelayer',
                        visible: true,
                        width: groundSpotConfig.width,
                        x: 0,
                        y: 0,
                        data: spotLayer
                    }];
                    this.elementsQuantity[layerKey] = 1;
                    this.elementsFreeSpaceAround[layerKey] = groundSpotConfig.freeSpaceAround;
                    this.elementsAllowPathsInFreeSpace[layerKey] = groundSpotConfig.allowPathsInFreeSpace;
                }
            }
            groundSpotConfig.spotLayers = spotLayers;
            if(sc.get(groundSpotConfig, 'depth', false) && 0 < Object.keys(spotLayers).length){
                this.generateSpotsWithDepth[spotKey] = groundSpotConfig;
            }
            this.generatedSpots[spotKey] = groundSpotConfig;
        }
    }

    mapTilesShortcuts(tilesKey, mainTile, propertiesMapper)
    {
        let propertiesMapperShortCut = 'path' === tilesKey || !propertiesMapper ? '' : tilesKey+'-';
        // as default get the tiles from the properties mapper:
        let mappedData = {
            surroundingTilesPosition: propertiesMapper?.surroundingTilesPosition,
            cornersPosition: propertiesMapper?.cornersPosition
        }
        // if property mapper does not have the tiles info then try to fetch the data from the wangsets:
        if(
            !propertiesMapper
            || 0 === Object.keys(propertiesMapper.surroundingTilesPosition).length
            || 0 === Object.keys(propertiesMapper.cornersPosition).length
        ) {
            mappedData = this.mapWangsetData(tilesKey);
        }
        // map the surrounding and corner tiles into the shortcuts:
        return new TilesShortcuts(
            sc.get(mappedData, 'mainTile', mainTile),
            mappedData.surroundingTilesPosition,
            mappedData.cornersPosition,
            propertiesMapperShortCut
        );
    }

    mapWangsetData(tilesKey)
    {
        return new WangsetMapper(this.fetchWangsetByName(tilesKey));
    }

    fetchWangsetByName(tilesKey)
    {
        let optimizedMapTileset = this.elementsProvider.optimizedMapFirstTileset();
        if(!optimizedMapTileset?.wangsets){
            return false;
        }
        let filteredWangsets = optimizedMapTileset.wangsets.filter(wangset => tilesKey === wangset.name);
        if(0 === filteredWangsets.length){
            return false;
        }
        // we need the tileset firstgid since all the tiles IDs in the wangset.wangtiles are relative to that:
        filteredWangsets[0].firstgid = optimizedMapTileset.firstgid;
        return filteredWangsets[0];
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

    createSpotLayer(width, height, markPercentage = 100, tileIndex = 0, applyBorders = false)
    {
        let totalTiles = this.computeTotalTiles(width, height, applyBorders);
        let layerData = new Array(width * height).fill(0);
        if(100 <= markPercentage){
            return this.fillAllTiles(layerData, width, height, tileIndex, applyBorders);
        }
        let tilesToFill = Math.round(totalTiles * (markPercentage / 100));
        if(0 >= tilesToFill){
            return layerData;
        }
        let visited = new Array(width * height).fill(false);
        let startIndex = this.randomCentralIndex(width, height, applyBorders);
        let queue = [startIndex];
        visited[startIndex] = true;
        let placedCount = 0;
        while(queue.length > 0 && placedCount < tilesToFill){
            let pick = Math.floor(Math.random() * queue.length);
            let current = queue[pick];
            queue[pick] = queue[queue.length - 1];
            queue.pop();
            if(0 === layerData[current]){
                layerData[current] = tileIndex;
                placedCount++;
            }
            let neighbors = this.get4Neighbors(current, width, height, applyBorders);
            neighbors = this.shuffleArray(neighbors);
            for(let n = 0; n < neighbors.length; n++){
                let neighbor = neighbors[n];
                if(!visited[neighbor]){
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            }
        }
        return layerData;
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

    fillAllTiles(layerData, width, height, tileIndex, applyBorders)
    {
        if(!applyBorders){
            for(let i = 0; i < layerData.length; i++){
                layerData[i] = tileIndex;
            }
            return layerData;
        }
        if(width <= 2 || height <= 2){
            return layerData;
        }
        for(let y = 1; y < height - 1; y++){
            for(let x = 1; x < width - 1; x++){
                let index = y * width + x;
                layerData[index] = tileIndex;
            }
        }
        return layerData;
    }

    computeTotalTiles(width, height, applyBorders)
    {
        if(!applyBorders){
            return width * height;
        }
        if(width <= 2 || height <= 2){
            return 0;
        }
        return (width - 2) * (height - 2);
    }

    randomIndex(width, height, applyBorders)
    {
        if(!applyBorders){
            return Math.floor(Math.random() * (width * height));
        }
        if(width <= 2 || height <= 2){
            return 0;
        }
        let x = Math.floor(Math.random() * (width - 2)) + 1;
        let y = Math.floor(Math.random() * (height - 2)) + 1;
        return y * width + x;
    }

    changeMapSize(layerData, width, height, extraTiles, increase = true)
    {
        let oldData = layerData;
        let newWidth = increase ? width + extraTiles * 2 : width - extraTiles * 2;
        let newHeight = increase ? height + extraTiles * 2 : height - extraTiles * 2;
        let newData = new Array(newWidth * newHeight).fill(0);
        for(let y = 0; y < newHeight; y++){
            for(let x = 0; x < newWidth; x++){
                let oldX = increase ? x - extraTiles : x + extraTiles;
                let oldY = increase ? y - extraTiles : y + extraTiles;
                let oldIndex = oldY * width + oldX;
                let newIndex = y * newWidth + x;
                newData[newIndex] = oldData[oldIndex] || 0;
            }
        }
        return {
            width: newWidth,
            height: newHeight,
            data: newData
        };
    }

}

module.exports.RandomMapGenerator = RandomMapGenerator;
