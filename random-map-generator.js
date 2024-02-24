/**
 *
 * Reldens - Tile Map Generator
 *
 */

let { OptionsValidator } = require('./lib/validator/options-validator');
let { PathFinder } = require('./lib/path-finder/path-finder');
let { FileHandler } = require('./lib/files/file-handler');
let { Logger, sc } = require('@reldens/utils');

class RandomMapGenerator
{
    version = 1;

    constructor(props)
    {
        this.currentDate = (new Date()).toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-');
        this.defaultMapFileName = `random-map-v${this.version}-${this.currentDate}.json`;
        this.optionsValidator = new OptionsValidator();
        this.pathFinder = new PathFinder();
        this.fileHandler = new FileHandler();
        this.isReady = false;
        if(props && 0 < Object.keys(props).length){
            this.setOptions(props);
            this.isReady = this.validate();
        }
    }

    setOptions(options)
    {
        // required:
        this.rootFolder = sc.get(options, 'rootFolder', __dirname);
        this.generatedFolder = sc.get(
            options,
            'generatedFolder',
            this.fileHandler.joinPaths(this.rootFolder, 'generated')
        );
        this.mapFileName = sc.get(
            options,
            'mapFileName',
            this.fileHandler.joinPaths(this.generatedFolder, this.defaultMapFileName)
        );
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
        this.margin = sc.get(options, 'margin', 0);
        this.spacing = sc.get(options, 'spacing', 0);
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
        this.corners = sc.get(options, 'corners', null);
        this.mapBackgroundColor = sc.get(options, 'mapBackgroundColor', '#000000');
        this.mapCompressionLevel = sc.get(options, 'mapCompressionLevel', 0);
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

    generate()
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
                image: this.tileSheetPath,
                imageheight: this.imageHeight,
                imagewidth: this.imageWidth,
                margin: this.margin,
                name: 'tilesheet',
                spacing: this.spacing,
                tilecount: this.tileCount,
                tileheight: this.tileSize,
                tilewidth: this.tileSize
            }],
            layers
        };
        this.fileHandler.copyTilesheet(this.tileSheetPath, this.tileSheetName, this.generatedFolder);
        // save the map in a JSON file:
        this.fileHandler.writeFile(this.mapFileName, this.mapToJSON(map));
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
        // starting point for the path to each element:
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
        let totalTiles = this.mapGrid.flat().filter(tile => tile === true).length;
        let tilesToChange = Math.floor(totalTiles * (this.variableTilesPercentage / 100));
        for(let i = 0, applied = 0; applied < tilesToChange && i < totalTiles * 2; i++){
            let x = Math.floor(Math.random() * this.mapWidth);
            let y = Math.floor(Math.random() * this.mapHeight);
            let position = y * this.mapWidth + x;

            if(this.mapGrid[y][x]){
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

    isInvalidMapPointY(increasedPointY, mapHeight)
    {
        return increasedPointY < 0 || increasedPointY >= mapHeight;
    }

    isInvalidMapPointX(increasedPointX, mapWidth)
    {
        return increasedPointX < 0 || increasedPointX >= mapWidth;
    }

    isBorder(pathTilePosition)
    {
        return 0 >= pathTilePosition.x
            || 0 >= pathTilePosition.y
            || this.mapWidth === pathTilePosition.x
            || this.mapHeight === pathTilePosition.y;
    }

    getMovementDirection(point, previousPoint1, previousPoint2)
    {
        // determine vertical direction from previousPoint2 to previousPoint1
        let verticalDirection = '';
        if(previousPoint1[1] > previousPoint2[1]){
            verticalDirection = 'down';
        } else if(previousPoint1[1] < previousPoint2[1]){
            verticalDirection = 'top';
        }
        // determine horizontal direction from previousPoint1 to point
        let horizontalDirection = '';
        if(point[0] > previousPoint1[0]){
            horizontalDirection = 'right';
        } else if(point[0] < previousPoint1[0]){
            horizontalDirection = 'left';
        }
        // combine the directions
        // ensure we only add '-' if both directions are present
        return `${verticalDirection}${verticalDirection && horizontalDirection ? '-' : ''}${horizontalDirection}`;
    }

    fixHorizontalPaths(previousPoint, point)
    {
        let horizontalChanged = previousPoint[0] !== point[0];
        if(horizontalChanged){
            let previousTopY = previousPoint[1] - 1;
            let previousTopX = previousPoint[0];
            let previousTopIndex = this.tileIndexByRowAndColumn(previousTopY, previousTopX);
            let previousBottomY = previousPoint[1] + 1;
            let previousBottomX = previousPoint[0];
            let previousBottomIndex = this.tileIndexByRowAndColumn(previousBottomY, previousBottomX);
            if(this.pathLayerData[previousTopIndex] !== this.pathTile && !this.isBorder({
                x: previousTopX,
                y: previousTopY
            }, this.mapWidth, this.mapHeight)){
                this.pathLayerData[previousTopIndex] = this.surroundingTiles['-1,0'];
            }
            if(this.pathLayerData[previousBottomIndex] !== this.pathTile && !this.isBorder({
                x: previousBottomX,
                y: previousBottomY
            })){
                this.pathLayerData[previousBottomIndex] = this.surroundingTiles['1,0'];
            }
        }
        return horizontalChanged;
    }

    fixVerticalPaths(previousPoint, point)
    {
        let verticalChanged = previousPoint[1] !== point[1];
        if(verticalChanged){
            let previousLeftY = previousPoint[1];
            let previousLeftX = previousPoint[0] - 1;
            let previousLeftIndex = this.tileIndexByRowAndColumn(previousLeftY, previousLeftX);
            let previousRightY = previousPoint[1];
            let previousRightX = previousPoint[0] + 1;
            let previousRightIndex = this.tileIndexByRowAndColumn(previousRightY, previousRightX);
            if(this.pathLayerData[previousLeftIndex] !== this.pathTile && !this.isBorder({
                x: previousLeftX,
                y: previousLeftY
            }, this.mapWidth, this.mapHeight)){
                this.pathLayerData[previousLeftIndex] = this.surroundingTiles['0,-1'];
            }
            if(this.pathLayerData[previousRightIndex] !== this.pathTile && !this.isBorder({
                x: previousRightX,
                y: previousRightY
            }, this.mapWidth, this.mapHeight)){
                this.pathLayerData[previousRightIndex] = this.surroundingTiles['0,1'];
            }
        }
        return verticalChanged;
    }

    replaceSequence(array, originalSequence, replaceSequence)
    {
        let originalSeqArray = originalSequence.split(',').map(Number);
        let replaceSeqArray = replaceSequence.split(',').map(Number);
        for(let i = 0; i <= array.length - originalSeqArray.length; i++){
            if(array.slice(i, i + originalSeqArray.length).every((value, index) => value === originalSeqArray[index])){
                array.splice(i, originalSeqArray.length, ...replaceSeqArray);
            }
        }
        return array;
    }

    applySurroundingPaths(point)
    {
        for(let i = -1; i <= 1; i++){
            for(let j = -1; j <= 1; j++){
                if(j === 0 && i === 0){
                    continue;
                }
                let increasedPointY = point[1] + i;
                if(this.isInvalidMapPointY(increasedPointY, this.mapHeight)){
                    increasedPointY = point[1];
                }
                let increasedPointX = point[0] + j;
                if(this.isInvalidMapPointX(increasedPointX, this.mapWidth)){
                    increasedPointX = point[0];
                }
                if(this.isBorder({x: increasedPointX, y: increasedPointY}, this.mapWidth, this.mapHeight)){
                    continue;
                }
                let nodeIndex = this.tileIndexByRowAndColumn(increasedPointY, increasedPointX);
                if(0 === this.pathLayerData[nodeIndex]){
                    // this MUST BE different to the pathTile
                    let surroundingTile = this.surroundingTiles[`${i},${j}`];
                    if(surroundingTile && surroundingTile !== this.pathTile){
                        this.pathLayerData[nodeIndex] = surroundingTile;
                    }
                }
            }
        }
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
                let previousPoint = false;
                let pointIndex = 0;
                for(let point of path){
                    let indexPoint = point[1] * this.mapWidth + point[0];
                    this.pathLayerData[indexPoint] = this.pathTile; // mark the path
                    this.mapGrid[point[1]][point[0]] = false; // mark as occupied/not-walkable
                    this.applySurroundingPaths(point);
                    if(0 === pointIndex){
                        previousPoint = point;
                        pointIndex++;
                        continue
                    }
                    this.fixHorizontalPaths(previousPoint, point);
                    this.fixVerticalPaths(previousPoint, point);
                    previousPoint = point;
                    pointIndex++;
                }
            }
        }
        // shame, shame, shame:
        this.replaceSequence(this.pathLayerData, '121,0,121', '121,121,121');
        this.replaceSequence(this.pathLayerData, '121,129,121', '121,121,121');
        this.replaceSequence(this.pathLayerData, '121,129,0', '121,129,0');
        this.replaceSequence(this.pathLayerData, '121,126,121', '121,121,121');
        this.replaceSequence(this.pathLayerData, '127,127', '127,124');
        this.replaceSequence(this.pathLayerData, '132,132', '132,131');
        this.replaceSequence(this.pathLayerData, '121,131,131', '121,282,131');
        this.replaceSequence(this.pathLayerData, '127,121', '126,121');
        this.replaceSequence(this.pathLayerData, '124,121', '126,121');
        this.replaceSequence(this.pathLayerData, '133,133', '131,133');
        this.replaceSequence(this.pathLayerData, '130,120', '124,130');
        this.replaceSequence(this.pathLayerData, '131,121', '283,121');
        this.replaceSequence(this.pathLayerData, '124,126', '124,285');
        this.replaceSequence(this.pathLayerData, '131,126', '131,283');
        this.replaceSequence(this.pathLayerData, '127,126', '127,285');
        this.replaceSequence(this.pathLayerData, '121,124,130', '121,284,130');
        this.replaceSequence(this.pathLayerData, '130,130', '124,130');
        this.replaceSequence(this.pathLayerData, '132,126', '132,283');
        this.replaceSequence(this.pathLayerData, '127,126', '127,285');
        this.replaceSequence(this.pathLayerData, '121,126,121', '121,121,121');
        this.replaceSequence(this.pathLayerData, '121,131,131', '121,282,131');
        this.replaceSequence(this.pathLayerData, '121,130,0', '121,129,0');
        this.replaceSequence(this.pathLayerData, '121,130,121', '121,121,121');
        this.replaceSequence(this.pathLayerData, '121,124,124', '121,284,124');
        this.replaceSequence(this.pathLayerData, '121,129,130', '121,284,130');
        this.replaceSequence(this.pathLayerData, '129,124', '284,124');
        this.replaceSequence(this.pathLayerData, '130,124', '124,124');
        this.replaceSequence(this.pathLayerData, '284,124,283', '121,121,121');
        this.replaceSequence(this.pathLayerData, '129,133', '282,133');
        this.replaceSequence(this.pathLayerData, '129,131', '282,131');
        this.replaceSequence(this.pathLayerData, '121,131,133', '121,282,133');
        this.replaceSequence(this.pathLayerData, '121,131', '121,282');
        this.replaceSequence(this.pathLayerData, '121,133', '121,129');
        this.replaceSequence(this.pathLayerData, '121,124', '121,284');
        this.replaceSequence(this.pathLayerData, '132,121', '126,121');
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

    mapToJSON(map)
    {
        let jsonString = JSON.stringify(map, null, 4);
        let dataPattern = /("data":\s*\[\n\s*)([\s\S]*?)(\n\s*\])/g;

        return jsonString.replace(dataPattern, (match, start, dataArray, end) => {
            let singleLineArray = dataArray.replace(/\s+/g, '');
            return `${start.trim()}${singleLineArray}${end.trim()}`;
        });
    }
}

module.exports.RandomMapGenerator = RandomMapGenerator;
