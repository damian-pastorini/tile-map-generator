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
        this.defaultMapFileName = 'random-map-' + this.currentDate;
        this.isReady = false;
        if (props && 0 < Object.keys(props).length) {
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
        // optional:
        this.rootFolder = sc.get(options, 'rootFolder', __dirname);
        this.generatedFolder = sc.get(
            options,
            'generatedFolder',
            this.fileHandler.joinPaths(this.rootFolder, 'generated')
        );
        this.mapFileName = sc.get(options, 'mapFileName', this.defaultMapFileName);
        this.mapFileFullPath = this.fileHandler.joinPaths(this.generatedFolder, this.mapFileName);
        this.mapName = this.mapFileName.toString().replace('.json', '');
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
        this.pathTile = sc.get(options, 'pathTile', 0);
        this.collisionLayersForPaths = sc.get(options, 'collisionLayersForPaths', []);
        this.randomGroundTiles = sc.get(options, 'randomGroundTiles', []);
        this.surroundingTiles = sc.get(options, 'surroundingTiles', {});
        this.surroundingTilesKeys = Object.keys(this.surroundingTiles);
        if (0 < this.surroundingTilesKeys.length) {
            for (let position of this.surroundingTilesKeys) {
                let tile = this.surroundingTiles[position.toString()];
                this.propertiesMapper.mapSurroundingByPosition(position, tile);
            }
        }
        this.corners = sc.get(options, 'corners', {});
        this.cornersKeys = Object.keys(this.corners);
        if (0 < this.cornersKeys.length) {
            for (let position of this.cornersKeys) {
                let tile = this.corners[position];
                this.propertiesMapper.mapCornersByPosition(position, tile);
            }
        }
        this.tilesShortcuts = {
            p: this.pathTile,
            sTL: this.propertiesMapper.surroundingTilesPosition['top-left'],
            sTC: this.propertiesMapper.surroundingTilesPosition['top-center'],
            sTR: this.propertiesMapper.surroundingTilesPosition['top-right'],
            sML: this.propertiesMapper.surroundingTilesPosition['middle-left'],
            // sMC: '121', // since 'middle-center' is directly assigned
            sMR: this.propertiesMapper.surroundingTilesPosition['middle-right'],
            sBL: this.propertiesMapper.surroundingTilesPosition['bottom-left'],
            sBC: this.propertiesMapper.surroundingTilesPosition['bottom-center'],
            sBR: this.propertiesMapper.surroundingTilesPosition['bottom-right'],
            cTL: this.propertiesMapper.cornersPosition['top-left'],
            cTR: this.propertiesMapper.cornersPosition['top-right'],
            cBL: this.propertiesMapper.cornersPosition['bottom-left'],
            cBR: this.propertiesMapper.cornersPosition['bottom-right']
        };
        this.mapBackgroundColor = sc.get(options, 'mapBackgroundColor', '#000000');
        this.mapCompressionLevel = sc.get(options, 'mapCompressionLevel', 0);
        this.applySurroundingPathTiles = sc.get(options, 'applySurroundingPathTiles', true);
        this.writeCroppedElementsFiles = sc.get(options, 'writeCroppedElementsFiles', false);
        this.orderElementsBySize = sc.get(options, 'orderElementsBySize', true);
        this.randomizeQuantities = sc.get(options, 'randomizeQuantities', false);
        this.associatedMapsConfig = sc.get(options, 'associatedMapsConfig', {});
        this.placeElementsOrder = sc.get(options, 'placeElementsOrder', 'random');
        this.generatedMainPathIndexes = sc.get(options, 'generatedMainPathIndexes', []);
        this.previousMainPath = sc.get(options, 'previousMainPath', []);
        this.removeOptimizedMapFilesAfterGeneration = sc.get(options, 'removeOptimizedMapFilesAfterGeneration', true);
        this.previousFloorData = sc.get(options, 'previousFloorData', {});
        this.nextLayerId = 0;
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapGrid = [];
        this.groundLayerData = [];
        this.pathLayerData = [];
        this.pathLayerProperties = [];
        this.mainPathStart = {x: 0, y: 0};
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
        let mapFileName = props.mapFileName || 'random-map-' + sc.getDateForFileName();
        elementsProviderData.mapFileName = mapFileName + '-elements';
        elementsProviderData.writeCroppedElementsFiles = props.writeCroppedElementsFiles;
        this.elementsProvider = new ElementsProvider(elementsProviderData);
        await this.elementsProvider.splitElements();
        this.mappedMapDataFromProvider = MapDataMapper.fromProvider(props, mapFileName, this.elementsProvider);
        this.resetInstance(this.mappedMapDataFromProvider);
        return this;
    }

    async generate()
    {
        this.isReady = this.validate();
        if(!this.isReady){
            return false;
        }
        this.generateEmptyMap();
        this.populateCollisionsMapBorder();
        this.generateInitialPath();
        this.placeElements();
        this.connectPaths();
        // apply variations after all the elements are displayed in the current map:
        this.applyVariations();
        let layers = this.generateLayersList();
        let mapNextLayerId = layers.length + 1;
        // map template:
        let map = {
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
                name: this.mapFileName.replace('.json', ''),
                spacing: this.spacing,
                tilecount: this.tileCount,
                tileheight: this.tileSize,
                tilewidth: this.tileSize,
                tiles: this.tiles,
            }],
            layers
        };
        this.fileHandler.createFolder(this.generatedFolder);
        this.fileHandler.copyFile(this.tileSheetPath, this.tileSheetName, this.generatedFolder);
        // save the map in a JSON file:
        if (-1 === this.mapFileFullPath.indexOf('.json')) {
            this.mapFileFullPath += '.json';
        }
        await this.fileHandler.writeFile(this.mapFileFullPath, JsonFormatter.mapToJSON(map));
        this.cleanAutoGeneratedProcessMapFiles();
        Logger.notice('Map file successfully generated: ' + this.mapFileName);
        // after the main map was created we can create the associated maps:
        return sc.deepJsonClone(map);
    }

    addMapProperty(name, type, value)
    {
        this.mapCustomProperties.push({name, type, value});
    }

    fetchMapProperty(name)
    {
        for (let property of this.mapCustomProperties){
            if (property.name === name){
                return property;
            }
        }
        return false;
    }

    cleanAutoGeneratedProcessMapFiles()
    {
        if (!this.removeOptimizedMapFilesAfterGeneration){
            return;
        }
        let filePrefix = 'optimized-';
        let fileSuffix = '-elements';
        let factor = '';
        if (this.elementsProvider?.factor) {
            factor = '-x' + this.elementsProvider.factor;
        }
        const fileExtensions = ['.png', '.json'];
        for (let extension of fileExtensions){
            let mapPath1 = this.mapFileFullPath.toString().replace('.json', '');
            let optimizedElementsFile = mapPath1.replace(this.mapName, filePrefix+this.mapName+fileSuffix+extension);
            let mapPath2 = this.mapFileFullPath.toString().replace('.json', '');
            let optimizedElementsFileFactor = mapPath2.replace(
                this.mapName,
                filePrefix+this.mapName+fileSuffix+factor+extension
            );
            if (this.fileHandler.exists(optimizedElementsFile)){
                this.fileHandler.removeByPath(optimizedElementsFile);
            }
            if (this.fileHandler.exists(optimizedElementsFileFactor)) {
                this.fileHandler.removeByPath(optimizedElementsFileFactor);
            }
        }
    }

    generateLayersList()
    {
        this.staticLayers.push(this.generateLayerWithData('ground', this.groundLayerData, 1));
        if(this.borderLayer){
            this.staticLayers.push(this.generateLayerWithData('collisions-map-border', this.borderLayer, 2));
        }
        if(this.pathLayerData){
            let pathLayer = this.generateLayerWithData('path', this.pathLayerData, 3);
            pathLayer.properties = this.pathLayerProperties;
            this.staticLayers.push(pathLayer);
        }
        if(0 < this.groundVariationsLayerData.length){
            this.staticLayers.push(this.generateLayerWithData('ground-variations', this.groundVariationsLayerData, 4));
        }
        return [...this.mergeLayersByTileValue(this.staticLayers, this.additionalLayers)];
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
            this.groundLayerData = Array(mapWidth * mapHeight).fill(this.groundTile);
        }
    }

    setMapSize()
    {
        if (0 < this.mapSize.mapWidth && 0 < this.mapSize.mapHeight) {
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

    calculateMapSizeWithFreeSpace(layerElements, elementsQuantity, freeSpaceTilesQuantity)
    {
        layerElements = layerElements || this.layerElements;
        if(!layerElements){
            Logger.error('No layer elements defined.');
            return false;
        }
        elementsQuantity = elementsQuantity || this.elementsQuantity;
        if(!sc.isObject(elementsQuantity) || 0 === Object.keys(elementsQuantity).length){
            Logger.error('No layer elements quantity defined.');
            return false;
        }
        freeSpaceTilesQuantity = freeSpaceTilesQuantity || this.freeSpaceTilesQuantity || 0;
        let totalArea = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        // calculate total area required by elements, including free space:
        for(let elementType of Object.keys(elementsQuantity)){
            let quantity = elementsQuantity[elementType];
            let element = this.fetchFirstTilesLayer(layerElements[elementType]);
            if (!element) {
                Logger.error('Element "tilelayer" not found: ' + elementType);
                continue;
            }
            let widthPlusFreeTiles = element.width + freeSpaceTilesQuantity * 2;
            let heightPlusFreeTiles = element.height + freeSpaceTilesQuantity * 2;
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

    fetchFirstTilesLayer(elementLayers)
    {
        for (let layer of elementLayers) {
            if ('tilelayer' === layer.type) {
                return layer;
            }
        }
        return false;
    }

    updateLayerData(elementData, elementNumber)
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
        for(let y = 0; y < elementData.height; y++){
            for(let x = 0; x < elementData.width; x++){
                let tileIndex = y * elementData.width + x;
                let mapIndex = (elementData.position.y + y) * this.mapWidth + (elementData.position.x + x);
                if(0 === elementData.data[tileIndex]){
                    continue;
                }
                layer.data[mapIndex] = elementData.data[tileIndex];
                this.mapGrid[elementData.position.y + y][elementData.position.x + x] = false;
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
                    y
                );
            }
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
    ) {
        let isChangePointsLayer = -1 !== layer.name.indexOf('change-points');
        if (!isChangePointsLayer) {
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
        if (elementExists) {
            return;
        }
        // when the elements name is indexOf 'stairs-', then we need to look up for the stairs number property
        this.generatedChangePoints[elementKey] = {
            elementData,
            tileIndex,
            mapIndex,
            elementNumber,
            x,
            y
        };
        if (!layer.properties) {
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
        y
    ) {
        if (0 === tileIndex) {
            return;
        }
        let isReturnPointLayer = -1 !== layer.name.indexOf('return-point');
        if (!isReturnPointLayer) {
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
        if (elementExists) {
            return;
        }
        let returnPointIndex = this.provideReturnIndexByPosition(x, y);
        this.generatedReturnPoints[elementKey] = {
            mapIndex: returnPointIndex
        };
        this.pathLayerProperties.push({
            name: 'return-point-for-'+elementKey,
            type: 'int',
            value: returnPointIndex
        });
    }

    provideElementKey(mapPrefix, elementData, elementNumber, currentFloorNumber, currentFloorKey)
    {
        let elementKey = mapPrefix.toString();
        let elementNameClean = elementData.name.replace('-change-points', '');
        let isStairsElement = -1 !== elementData.name.indexOf('stairs');
        if (!isStairsElement) {
            return elementKey + '-' + elementNameClean + '-n' + elementNumber;
        }
        let upperFloorString = '';
        let downFloorString = '';
        if (0 === currentFloorNumber) {
            upperFloorString = '-upperFloor-n1';
            downFloorString = '-downFloor-n1';
        }
        if (1 === currentFloorNumber) {
            if ('upper' === currentFloorKey) {
                upperFloorString = '-upperFloor-n2';
                downFloorString = '';
            }
            if ('down' === currentFloorKey) {
                upperFloorString = '';
                downFloorString = '-downFloor-n2';
            }
        }
        if (1 < currentFloorNumber) {
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
                if (!this.randomizeQuantities) {
                    this.placeElementOnMap(elementType, q);
                    continue;
                }
                randomizedElementsQuantity.push(elementType);
            }
        }
        randomizedElementsQuantity = this.shuffleArray(randomizedElementsQuantity);
        if (this.randomizeQuantities) {
            let q = 0;
            for (let elementType of randomizedElementsQuantity) {
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
        if (
            !sc.hasOwn(this.previousFloorData, 'floorKey')
            || (!this.previousFloorData['stairs-up'] && !this.previousFloorData['stairs-down'])
            || (!hasStairsUp && !hasStairsDown)
        ) {
            return;
        }
        if (hasStairsUp && this.previousFloorData['stairs-down'] && 'down' === this.previousFloorData['floorKey']) {
            this.placeElementOnMap('stairs-up', 0, this.previousFloorData['stairs-down']);
            delete this.elementsQuantity['stairs-up'];
        }
        if (hasStairsDown && this.previousFloorData['stairs-up'] && 'upper' === this.previousFloorData['floorKey']) {
            this.placeElementOnMap('stairs-down', 0, this.previousFloorData['stairs-up']);
            delete this.elementsQuantity['stairs-down'];
        }
    }

    shuffleArray(array)
    {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    placeElementOnMap(elementType, elementNumber, position = false)
    {
        let elementLayersDataArray = this.layerElements[elementType];
        let baseElementData = this.fetchFirstTilesLayer(elementLayersDataArray);
        if (!position) {
            position = this.findPosition(baseElementData.width, baseElementData.height);
        }
        if (!position) {
            Logger.warning('Position not found for element "'+elementType+'" in map "'+this.mapName+'".');
            return;
        }
        if (elementType === 'stairs-up' || elementType === 'stairs-down') {
            this.generatedFloorData[elementType] = position;
        }
        for (let elementLayer of elementLayersDataArray) {
            if ('tilelayer' !== elementLayer.type) {
                continue;
            }
            elementLayer.position = position;
            // update each layer with the elements tiles at the determined position:
            this.updateLayerData(elementLayer, elementNumber);
        }
    }

    sortedElementsQuantity()
    {
        // calculate area for each key:
        let elementsWithArea = Object.keys(this.elementsQuantity).map(key => {
            let area = 0;
            if (this.layerElements[key] && this.layerElements[key].length > 0) {
                let layerData = this.fetchFirstTilesLayer(this.layerElements[key]);
                area = layerData.height * layerData.width;
            }
            return {key, area, quantity: this.elementsQuantity[key]};
        });
        // sort by area:
        elementsWithArea.sort((a, b) => b.area - a.area);
        let sorted = {};
        for (let element of elementsWithArea) {
            sorted[element.key] = element.quantity;
        }
        return sorted;
    }

    findPosition(elementWidth, elementHeight)
    {
        if ('inOrder' === this.placeElementsOrder) {
            return this.findNextAvailablePosition(elementWidth, elementHeight);
        }
        if ('random' === this.placeElementsOrder) {
            return this.findRandomPosition(elementWidth, elementHeight);
        }
        return null;
    }

    findNextAvailablePosition(elementWidth, elementHeight)
    {
        for (let y=0; y < this.mapHeight; y++) {
            for (let x=0; x < this.mapWidth; x++) {
                if (this.canPlaceElement(x, y , elementWidth, elementHeight)){
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
            let x = Math.floor(Math.random() * (this.mapGrid[0].length - width));
            let y = Math.floor(Math.random() * (this.mapGrid.length - height));
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
        if (0 === this.randomGroundTiles.length) {
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
        if (0 < this.previousMainPath.length) {
            this.generateOppositeMainPath();
        }
        if (0 === this.generatedMainPathIndexes.length) {
            this.generateRandomMainPath();
        }
        if (0 < this.generatedMainPathIndexes.length) {
            for (let mainPathPoint of this.generatedMainPathIndexes) {
                let {index, y, x} = mainPathPoint;
                let result = this.placeMainPathIndex(index, y, x);
                if (!result) {
                    return false;
                }
            }
            if (!this.generatedReturnPoints['default-main-path']) {
                let returnPointIndex = this.provideReturnIndexByPosition(
                    this.generatedMainPathIndexes[0].x,
                    this.generatedMainPathIndexes[0].y
                );
                this.generatedReturnPoints['default-main-path'] = {
                    mapIndex: returnPointIndex
                };
                this.pathLayerProperties.push({
                    name: 'return-point-for-default-'+this.mapFileName,
                    type: 'int',
                    value: returnPointIndex
                });
            }
        }
    }

    generateRandomMainPath()
    {
        if (0 === this.mainPathSize){
            return;
        }
        // randomly choose an edge (top=0, right=1, bottom=2, left=3):
        switch (Math.floor(Math.random() * 4)) {
            case 0: // top edge
                this.mainPathStart.x = Math.floor(Math.random() * (this.mapWidth - this.mainPathSize));
                this.mainPathStart.y = 0;
                break;
            case 1: // right edge
                this.mainPathStart.x = this.mapWidth - 1;
                this.mainPathStart.y = Math.floor(Math.random() * (this.mapHeight - this.mainPathSize));
                break;
            case 2: // bottom edge
                this.mainPathStart.x = Math.floor(Math.random() * (this.mapWidth - this.mainPathSize));
                this.mainPathStart.y = this.mapHeight - 1;
                break;
            case 3: // left edge
                this.mainPathStart.x = 0;
                this.mainPathStart.y = Math.floor(Math.random() * (this.mapHeight - this.mainPathSize));
                break;
        }
        // @TODO - Refactor.
        for (let i = 0; i < this.mainPathSize; i++) {
            let x = this.mainPathStart.x;
            let y = this.mainPathStart.y;
            if (this.mainPathStart.y === 0 || this.mainPathStart.y === this.mapHeight - 1) { // top or bottom edge
                x += i;
            } else { // right or left edge
                y += i;
            }
            let index = y * this.mapWidth + x;
            this.generatedMainPathIndexes.push({index, x, y});
        }
    }

    generateOppositeMainPath()
    {
        let previousPathMiddleTile = Math.ceil(this.previousMainPath.length / 2);
        let referenceY = this.previousMainPath[previousPathMiddleTile].y;
        let shouldFlipVertically = 0 === referenceY || this.mapHeight - 1 === referenceY;
        this.generatedMainPathIndexes = [];
        for(let i = 0; i < this.previousMainPath.length; i++){
            let x = this.previousMainPath[i].x;
            if (!shouldFlipVertically) {
                x = 0 === x ? this.mapWidth - 1 : 0;
            }
            let y = this.previousMainPath[i].y;
            if (shouldFlipVertically) {
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
            this.mapGrid[y][x] = false; // mark as occupied
        } catch (error) {
            Logger.critical('Could not place main path tile.', index, y, x, error);
            return false;
        }
    }

    provideReturnIndexByPosition(x, y)
    {
        if (0 === x) {
            x = 1;
        }
        if (this.mapWidth - 1 === x) {
            x = this.mapWidth - 2;
        }
        if (0 === y) {
            y = 1;
        }
        if (this.mapHeight - 1 === y) {
            y = this.mapHeight - 2;
        }
        return y * this.mapWidth + x;
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
        if ('' === this.entryPosition) {
            return;
        }
        let entryPositionParts = this.entryPosition.split('-');
        if(2 !== entryPositionParts.length){
            Logger.critical('Could not create entry position.', this.entryPosition);
            return;
        }
        let direction = entryPositionParts[0];
        let position = entryPositionParts[1];
        let {x, y, xReturn, yReturn} = this.determinePositionInMap(direction, position);
        if (null === x || null === y) {
            Logger.critical('Invalid entry position data.', {entryPosition: this.entryPosition, x, y});
            return;
        }
        let returnToMainMapChangePointLayer = Array(this.mapWidth * this.mapHeight).fill(0);
        let layerProperties = [];
        for (let i = 0; i < this.entryPositionSize; i++) {
            // mark the entry position with 0 in the border layer:
            let mapIndex = y * this.mapWidth + x + i;
            this.borderLayer[mapIndex] = 0;
            // marking the mapGrid position as walkable
            this.mapGrid[y][x + i] = true;
            returnToMainMapChangePointLayer[mapIndex] = this.groundTile;
            if (this.entryPositionFrom) {
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
                if (!this.generatedReturnPoints[this.mapFileName]){
                    let returnPointMapIndex = yReturn * this.mapWidth + xReturn + i;
                    this.generatedReturnPoints[this.mapFileName] = {
                        tileIndex: this.groundTile,
                        mapIndex: returnPointMapIndex
                    };
                    layerProperties.push({
                        name: 'return-point-for-default-'+this.mapFileName,
                        type: 'int',
                        value: returnPointMapIndex
                    });
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
        // @TODO - BETA - Include directions left and right.
        if (direction === 'top') {
            y = 0;
            yReturn = 1;
        }
        if (direction === 'down') {
            y = this.mapHeight - 1;
            yReturn = this.mapHeight - 2;
        }
        if (position === 'left') {
            x = 1; // 1 instead of 0, since 0 is the vertical wall
        }
        if (position === 'middle') {
            // map width / 2 - entry position size / 2 to get the entry position in the middle:
            x = Math.floor(this.mapWidth / 2) - Math.floor(this.entryPositionSize / 2);
        }
        if (position === 'right') {
            // the first -1 is for the map vertical wall
            x = this.mapWidth - 1 - this.entryPositionSize;
        }
        return {x, y, xReturn: x, yReturn};
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
        for(let layer of this.additionalLayers){
            if('path' !== layer.name){
                continue;
            }
            let pathTilePositions = this.findPathTilePositions(layer.data);
            for(let pathTilePosition of pathTilePositions){
                if(this.isBorder(pathTilePosition)){
                    continue;
                }
                let path = this.pathFinder.findPath(
                    this.mainPathStart,
                    pathTilePosition,
                    grid
                );
                for(let point of path){
                    let indexPoint = point[1] * this.mapWidth + point[0];
                    this.pathLayerData[indexPoint] = this.pathTile; // mark the path
                    this.mapGrid[point[1]][point[0]] = false; // mark as occupied/not-walkable
                }
            }
        }
        if (!this.applySurroundingPathTiles){
            return;
        }
        // shortcuts:
        let {p, sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = this.tilesShortcuts;
        this.applyRotationToCompletePathGrid();
        // this has to happen in sequence to not mess up the rotation:
        this.replaceSequence(this.pathLayerData, [p,'0',p].join(','), [p,p,p].join(','));
        this.replaceSequence(this.pathLayerData, ['0',p].join(','), [sML,p].join(','));
        this.replaceSequence(this.pathLayerData, [p,'0'].join(','), [p,sMR].join(','));
        // rotate the path:
        this.pathLayerData = this.rotateLayer90Degrees(this.pathLayerData, this.mapWidth, this.mapHeight);
        this.replaceSequence(this.pathLayerData, [p,'0',p].join(','), [p,p,p].join(','));
        this.replaceSequence(this.pathLayerData, ['0',p].join(','), [sTC,p].join(','));
        this.replaceSequence(this.pathLayerData, [p,'0'].join(','), [p,sBC].join(','));
        // rollback rotation:
        this.pathLayerData = this.rollbackRotation90Degrees(this.pathLayerData, this.mapHeight, this.mapWidth);
        // add corners:
        this.replaceSequence(this.pathLayerData, ['0',sTC].join(','), [sTL,sTC].join(','));
        this.replaceSequence(this.pathLayerData, [sTC,'0'].join(','), [sTC,sTR].join(','));
        this.replaceSequence(this.pathLayerData, ['0',sBC].join(','), [sBL,sBC].join(','));
        this.replaceSequence(this.pathLayerData, [sBC,'0'].join(','), [sBC,sBR].join(','));
        this.replaceSequence(this.pathLayerData, [sBC,sML].join(','), [sBC,cBL].join(','));
        this.replaceSequence(this.pathLayerData, [sTC,sML].join(','), [sTC,cTL].join(','));
        this.replaceSequence(this.pathLayerData, [sMR,sBC].join(','), [cBR,sBC].join(','));
        this.replaceSequence(this.pathLayerData, [sMR,sTC].join(','), [cTR,sTC].join(','));
        // rotate to add upper corners:
        this.pathLayerData = this.rotateLayer90Degrees(this.pathLayerData, this.mapWidth, this.mapHeight);
        this.replaceSequence(this.pathLayerData, [sML,'0'].join(','), [sML,sBL].join(','));
        this.replaceSequence(this.pathLayerData, ['0',sML].join(','), [sTL,sML].join(','));
        this.replaceSequence(this.pathLayerData, [cBR,'0'].join(','), [cBR,sBL].join(','));
        this.replaceSequence(this.pathLayerData, [sMR,'0'].join(','), [sMR,sBR].join(','));
        this.replaceSequence(this.pathLayerData, [sMR,p].join(','), [cTR,p].join(','));
        this.replaceSequence(this.pathLayerData, [p,sMR].join(','), [p,cBR].join(','));
        this.replaceSequence(this.pathLayerData, [p,sML].join(','), [p,cBL].join(','));
        this.replaceSequence(this.pathLayerData, [sML,p].join(','), [cTL,p].join(','));
        this.replaceSequence(this.pathLayerData, ['0',sMR].join(','), [sTR,sMR].join(','));
        this.replaceSequence(this.pathLayerData, [cBL,'0'].join(','), [cBL,sBL].join(','));
        this.replaceSequence(this.pathLayerData, ['0',cBL].join(','), [sTR,cBL].join(','));
        this.replaceSequence(this.pathLayerData, ['0',cTL].join(','), [sTL,cTL].join(','));
        this.pathLayerData = this.rollbackRotation90Degrees(this.pathLayerData, this.mapHeight, this.mapWidth);
        // restore rotation and fix round corners:
        this.replaceSequence(this.pathLayerData, [sMR,sBL].join(','), [cBR,sBL].join(','));
        this.replaceSequence(this.pathLayerData, [sTL,sML].join(','), [sTL,cTL].join(','));
        this.replaceSequence(this.pathLayerData, [sMR,sBR].join(','), [cBR,sBR].join(','));
        this.replaceSequence(this.pathLayerData, [sBL,sML].join(','), [sBL,cBL].join(','));
        this.replaceSequence(this.pathLayerData, [sMR,sTR].join(','), [cTR,sTR].join(','));
        this.replaceSequence(this.pathLayerData, [cTR,'0'].join(','), [cTR,sTR].join(','));
        // clean up map borders:
        this.cleanUpMapBorders();
    }

    applyRotationToCompletePathGrid()
    {
        let singleSpace = [this.pathTile, 0, this.pathTile].join(',');
        let singleReplace = [this.pathTile, this.pathTile, this.pathTile].join(',');
        let doubleSpace = [this.pathTile, 0, 0, this.pathTile].join(',');
        let doubleReplace = [this.pathTile, this.pathTile, this.pathTile, this.pathTile].join(',');
        while (true) {
            this.replaceSequence(this.pathLayerData, doubleSpace, doubleReplace);
            let applyHorizontalChanges = this.replaceSequence(this.pathLayerData, singleSpace, singleReplace);
            this.pathLayerData = this.rotateLayer90Degrees(this.pathLayerData, this.mapWidth, this.mapHeight);
            this.replaceSequence(this.pathLayerData, doubleSpace, doubleReplace);
            let applyVerticalChanges = this.replaceSequence(this.pathLayerData, singleSpace, singleReplace);
            this.pathLayerData = this.rollbackRotation90Degrees(this.pathLayerData, this.mapHeight, this.mapWidth);
            if (!applyHorizontalChanges && !applyVerticalChanges) {
                break;
            }
        }
    }

    replaceSequence(array, originalSequence, replaceSequence)
    {
        let clonedArray = [...array];
        let originalSeqArray = originalSequence.split(',').map(Number);
        let replaceSeqArray = replaceSequence.split(',').map(Number);
        for(let i = 0; i <= array.length - originalSeqArray.length; i++){
            if(array.slice(i, i + originalSeqArray.length).every((value, index) => value === originalSeqArray[index])){
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
        for (let y = 0; y < originalHeight; y++) {
            for (let x = 0; x < originalWidth; x++) {
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
        for (let y = 0; y < rotatedHeight; y++) {
            for (let x = 0; x < rotatedWidth; x++) {
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
            if (-1 !== rowTopInvalidValues.indexOf(currentTopValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(0, c)] = 0;
            }
            let currentBottomValue = this.pathLayerData[this.tileIndexByRowAndColumn(this.mapHeight - 1, c)];
            if (-1 !== rowBottomInvalidValues.indexOf(currentBottomValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(this.mapHeight - 1, c)] = 0;
            }
        }
        for(let r = 0; r < this.mapHeight; r++){
            let currentLeftValue = this.pathLayerData[this.tileIndexByRowAndColumn(r, 0)];
            if (-1 !== rowLeftInvalidValue.indexOf(currentLeftValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(r, 0)] = 0;
            }
            let currentRightValue = this.pathLayerData[this.tileIndexByRowAndColumn(r, this.mapWidth - 1)];
            if (-1 !== rowRightInvalidValue.indexOf(currentRightValue)) {
                this.pathLayerData[this.tileIndexByRowAndColumn(r, this.mapWidth - 1)] = 0;
            }
        }
    }

    createPathfindingGrid()
    {
        let grid = this.pathFinder.create(this.mapWidth, this.mapHeight);
        for(let layer of this.additionalLayers){
            let isCollisionsLayer = false;
            for(let collisionLayer of this.collisionLayersForPaths){
                if(-1 !== layer.name.indexOf(collisionLayer)){
                    isCollisionsLayer = true;
                }
            }
            for(let c = 0; c < this.mapWidth; c++){
                for(let r = 0; r < this.mapHeight; r++){
                    let tileIndex = this.tileIndexByRowAndColumn(r, c);
                    let tile = layer.data[tileIndex];
                    let isZeroTile = 0 === Number(tile);
                    let isCollisionBody = !isZeroTile && isCollisionsLayer;
                    this.markPathFinderTile(isZeroTile, isCollisionBody, c, r, grid);
                }
            }
        }
        return grid;
    }

    tileIndexByRowAndColumn(row, column)
    {
        return row * this.mapWidth + column;
    }

    markPathFinderTile(isZeroTile, isCollisionBody, c, r, grid)
    {
        let hasBody = !isZeroTile && isCollisionBody;
        if(!hasBody){
            return;
        }
        grid.setWalkableAt(c, r, false);
    }

}

module.exports.RandomMapGenerator = RandomMapGenerator;
