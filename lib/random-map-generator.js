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
const { FileHandler, Logger, sc } = require('@reldens/utils');

class RandomMapGenerator
{

    constructor(props)
    {
        this.currentDate = sc.getDateForFileName();
        this.defaultMapFileName = 'random-map-'+this.currentDate;
        this.optionsValidator = new OptionsValidator();
        this.pathFinder = new PathFinder();
        this.fileHandler = new FileHandler();
        this.propertiesMapper = new PropertiesMapper();
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
        // optional:
        this.rootFolder = sc.get(options, 'rootFolder', __dirname);
        this.generatedFolder = sc.get(
            options,
            'generatedFolder',
            this.fileHandler.joinPaths(this.rootFolder, 'generated')
        );
        this.mapFileName = sc.get(options, 'mapFileName', this.defaultMapFileName);
        this.mapFileFullPath = this.fileHandler.joinPaths(this.generatedFolder, this.mapFileName);
        this.margin = sc.get(options, 'margin', 0);
        this.spacing = sc.get(options, 'spacing', 0);
        this.tiles = sc.get(options, 'tiles', []);
        this.groundTile = sc.get(options, 'groundTile', 0);
        this.borderTile = sc.get(options, 'borderTile', 0);
        this.generateElementsPath = sc.get(options, 'generateElementsPath', true);
        this.mainPathSize = sc.get(options, 'mainPathSize', 0);
        this.blockMapBorder = sc.get(options, 'blockMapBorder', false);
        this.borderLayer = this.blockMapBorder && 0 === this.borderTile;
        this.isBorderWalkable = sc.get(options, 'isBorderWalkable', false);
        this.freeSpaceTilesQuantity = sc.get(options, 'freeSpaceTilesQuantity', 0);
        if(1 > this.freeSpaceTilesQuantity && this.blockMapBorder){
            this.freeSpaceTilesQuantity = 1;
        }
        this.variableTilesPercentage = sc.get(options, 'variableTilesPercentage', 0);
        this.pathTile = sc.get(options, 'pathTile', null);
        this.collisionLayersForPaths = sc.get(options, 'collisionLayersForPaths', []);
        this.randomGroundTiles = sc.get(options, 'randomGroundTiles', []);
        this.surroundingTiles = sc.get(options, 'surroundingTiles', null);
        for (let position of Object.keys(this.surroundingTiles)) {
            let tile = this.surroundingTiles[position.toString()];
            this.propertiesMapper.mapSurroundingByPosition(position, tile);
        }
        this.corners = sc.get(options, 'corners', null);
        for (let position of Object.keys(this.corners)) {
            let tile = this.corners[position];
            this.propertiesMapper.mapCornersByPosition(position, tile);
        }
        this.tilesShortcuts = {
            p: this.pathTile,
            sTL: this.propertiesMapper.surroundingTilesPosition['top-left'],
            sTC: this.propertiesMapper.surroundingTilesPosition['top-center'],
            sTR: this.propertiesMapper.surroundingTilesPosition['top-right'],
            sML: this.propertiesMapper.surroundingTilesPosition['middle-left'],
            // sMC: '121', // Since 'middle-center' is directly assigned
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
        // dynamic generated:
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapGrid = [];
        this.groundLayerData = [];
        this.pathLayerData = [];
        this.mainPathStart = {x: 0, y: 0};
        this.additionalLayers = [];
        this.staticLayers = [];
        this.totalStaticLayers = 1
            + (this.borderLayer ? 1 : 0)
            + (0 < this.variableTilesPercentage ? 1 : 0)
            + (null !== this.pathTile ? 1 : 0);
    }

    validate()
    {
        return this.optionsValidator.validate(this);
    }

    static async fromComposite(props)
    {
        let elementsProviderData = Object.assign({}, props);
        let mapFileName = props.mapFileName || 'random-map-' + sc.getDateForFileName();
        elementsProviderData.mapFileName = mapFileName+'-elements';
        let elementsProvider = new ElementsProvider(elementsProviderData);
        await elementsProvider.splitElements();
        let optimizedMap = elementsProvider.optimizedMap;
        let optimizedTileset = optimizedMap.tilesets[0];
        let mapData = {
            rootFolder: props.rootFolder,
            mapFileName: mapFileName+'.json',
            tileSize: optimizedMap.tilewidth,
            tileSheetPath: elementsProvider.fileHandler.joinPaths('generated', optimizedTileset.image),
            tileSheetName: mapFileName+'.png' || optimizedTileset.image,
            imageHeight: optimizedTileset.imageheight,
            imageWidth: optimizedTileset.imagewidth,
            tileCount: optimizedTileset.tilecount,
            columns: optimizedTileset.columns,
            margin: optimizedTileset.margin,
            spacing: optimizedTileset.spacing,
            tiles: optimizedTileset.tiles,
            layerElements: elementsProvider.croppedElements,
            elementsQuantity: elementsProvider.elementsQuantity,
            groundTile: elementsProvider.groundTile,
            mainPathSize: props.mainPathSize || 3,
            blockMapBorder: props.blockMapBorder,
            freeSpaceTilesQuantity: props.freeSpaceTilesQuantity,
            variableTilesPercentage: props.variableTilesPercentage,
            pathTile: elementsProvider.pathTile,
            collisionLayersForPaths: props.collisionLayersForPaths || ['change-points', 'collisions', 'tree-base'],
            randomGroundTiles: elementsProvider.randomGroundTiles,
            surroundingTiles: elementsProvider.surroundingTiles,
            corners: elementsProvider.corners
        };
        return new this(mapData);
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
        this.placeElementsRandomly();
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
            tilesets: [{
                columns: this.columns,
                firstgid: 1,
                image: this.tileSheetName,
                imageheight: this.imageHeight,
                imagewidth: this.imageWidth,
                margin: this.margin,
                name: 'tilesheet',
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
        await this.fileHandler.writeFile(this.mapFileFullPath, JsonFormatter.mapToJSON(map));
    }

    generateLayersList()
    {
        this.staticLayers.push(this.generateLayerWithData('ground', this.groundLayerData, 1));
        if(this.borderLayer){
            this.staticLayers.push(this.generateLayerWithData('collisions-map-border', this.borderLayer, 2));
        }
        if(this.pathLayerData){
            this.staticLayers.push(this.generateLayerWithData('path', this.pathLayerData, 3));
        }
        if(this.groundVariationsLayerData){
            this.staticLayers.push(this.generateLayerWithData('ground-variations', this.groundVariationsLayerData, 4));
        }
        return [...this.mergeLayersByTileValue(this.staticLayers, this.additionalLayers)];
    }

    generateInitialPath()
    {
        if(!this.generateElementsPath){
            return false;
        }
        this.pathLayerData = Array(this.mapWidth * this.mapHeight).fill(0);
        // @NOTE: the main path is used as the starting point for the path to each element.
        this.placeMainPath();
    }

    generateEmptyMap()
    {
        let {mapWidth, mapHeight} = this.calculateMapSizeWithFreeSpace();
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.mapGrid = Array.from({length: mapHeight}, () => Array(mapWidth).fill(true));
        if(0 !== this.groundTile){
            this.groundLayerData = Array(mapWidth * mapHeight).fill(this.groundTile);
        }
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
        if(!elementsQuantity){
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
            // assuming first layer represents size:
            let element = layerElements[elementType][0];
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

    generateAdditionalLayers()
    {
        let addedLayerNames = new Set();
        let nextLayerId = this.totalStaticLayers;
        for(let elementType of Object.keys(this.layerElements)){
            for(let layer of this.layerElements[elementType]){
                // check if layer name is unique
                if(!addedLayerNames.has(layer.name)){
                    // fill layer with empty tiles:
                    let layerData = Array(this.mapWidth * this.mapHeight).fill(0);
                    this.additionalLayers.push(this.generateLayerWithData(layer.name, layerData, nextLayerId++));
                    // mark this layer name as added:
                    addedLayerNames.add(layer.name);
                }
            }
        }
    }

    findRandomPosition(width, height)
    {
        let maxTries = 100;
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

    updateLayerData(elementData)
    {
        let layerIndex = this.additionalLayers.findIndex(layer => layer.name === elementData.name);
        if(-1 === layerIndex){
            return;
        }
        let layer = this.additionalLayers[layerIndex];
        for(let i = 0; i < elementData.height; i++){
            for(let j = 0; j < elementData.width; j++){
                let tileIndex = i * elementData.width + j;
                let mapIndex = (elementData.position.y + i) * this.mapWidth + (elementData.position.x + j);
                if(elementData.data[tileIndex] !== 0){
                    layer.data[mapIndex] = elementData.data[tileIndex];
                    this.mapGrid[elementData.position.y + i][elementData.position.x + j] = false;
                }
            }
        }
    }

    placeElementsRandomly()
    {
        this.generateAdditionalLayers();
        for(let elementType of Object.keys(this.elementsQuantity)){
            for(let q = 0; q < this.elementsQuantity[elementType]; q++){
                let elementDataArray = this.layerElements[elementType];
                // use the base layer to find a position:
                let baseElementData = elementDataArray[0];
                let position = this.findRandomPosition(baseElementData.width, baseElementData.height);
                if(position){
                    for(let elementData of elementDataArray){
                        elementData.position = position;
                        // update each layer with the elements tiles at the determined position:
                        this.updateLayerData(elementData);
                    }
                }
            }
        }
        // filter out layers without any tiles set:
        this.additionalLayers = this.additionalLayers.filter(layer => layer.data.some(tile => tile !== 0));
    }

    applyVariations()
    {
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
        // randomly choose an edge (top=0, right=1, bottom=2, left=3):
        switch (Math.floor(Math.random() * 4)){
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
        for(let i = 0; i < this.mainPathSize; i++){
            let x = this.mainPathStart.x;
            let y = this.mainPathStart.y;
            if(this.mainPathStart.y === 0 || this.mainPathStart.y === this.mapHeight - 1){ // top or bottom edge
                x += i;
            } else { // right or left edge
                y += i;
            }
            let index = y * this.mapWidth + x;
            this.pathLayerData[index] = this.pathTile;
            this.mapGrid[y][x] = false; // mark as occupied
        }
    }

    populateCollisionsMapBorder()
    {
        if(!this.borderLayer){
            return false;
        }
        this.borderLayer = Array(this.mapWidth * this.mapHeight).fill(0);
        for(let x = 0; x < this.mapWidth; x++){
            // top border:
            this.borderLayer[x] = this.groundTile;
            // bottom border:
            this.borderLayer[(this.mapHeight - 1) * this.mapWidth + x] = this.groundTile;
        }
        for(let y = 0; y < this.mapHeight; y++){
            // left border:
            this.borderLayer[y * this.mapWidth] = this.groundTile;
            // right border:
            this.borderLayer[y * this.mapWidth + (this.mapWidth - 1)] = this.groundTile;
        }
        if(!this.isBorderWalkable){
            this.markBorderAsNotWalkable();
        }
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

        combinedLayers.forEach(layer => {
            // if the layer has already been encountered, merge their data:
            if(mergedLayersByName.has(layer.name)){
                let existingLayer = mergedLayersByName.get(layer.name);
                // merge data arrays, preferring non-zero values:
                existingLayer.data = existingLayer.data.map((tile, index) => tile > 0 ? tile : layer.data[index]);
            } else {
                // clone the layer to avoid mutating the original objects:
                let clonedLayer = JSON.parse(JSON.stringify(layer));
                mergedLayersByName.set(layer.name, clonedLayer);
            }
        });

        // Convert the merged layers back into an array.
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
        const originalWidth = rotatedHeight; // The original width is the rotated height
        const originalHeight = rotatedWidth; // The original height is the rotated width
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
