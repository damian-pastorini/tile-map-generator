/**
 *
 * Reldens - Tile Map Generator
 *
 */

const { OptionsValidator } = require('./validator/options-validator');
const fs = require('fs');
const path = require('path');
const { Grid, AStarFinder } = require('pathfinding');
const { Logger, sc } = require('@reldens/utils');

class RandomMapGenerator
{
    version = 1;

    constructor(props)
    {
        this.currentDate = (new Date()).toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-');
        this.defaultMapFileName = `random-map-v${this.version}-${this.currentDate}.json`;
        this.optionsValidator = new OptionsValidator();
        this.isReady = false;
        if(props && 0 < Object.keys(props).length){
            this.setOptions(props);
            this.isReady = this.validate();
        }
    }

    setOptions(options)
    {
        // required:
        this.mapFileName = sc.get(options, 'mapFileName', path.join(__dirname, 'generated', this.defaultMapFileName));
        this.tileSize = sc.get(options, 'tileSize', false);
        this.tilesheetPath = sc.get(options, 'tilesheetPath', false);
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
        this.isBorderWalkable = sc.get(options, 'isBorderWalkable', false);
        this.freeSpaceTilesQuantity = sc.get(options, 'freeSpaceTilesQuantity', 0);
        if (1 > this.freeSpaceTilesQuantity && this.blockMapBorder) {
            this.freeSpaceTilesQuantity = 1;
        }
        this.variableTilesPercentage = sc.get(options, 'variableTilesPercentage', 0);
        this.pathTile = sc.get(options, 'pathTile', null);
        this.collisionLayersForPaths = sc.get(options, 'collisionLayersForPaths', []);
        this.randomGroundTiles = sc.get(options, 'randomGroundTiles', []);
        this.surroundingTiles = sc.get(options, 'surroundingTiles', null);
        this.corners = sc.get(options, 'corners', null);
        // dynamic generated:
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapGrid = [];
        this.groundLayerData = [];
        this.pathLayerData = [];
        this.mainPathStart = {pathStartX: 0, pathStartY: 0};
        this.nextLayerId = 1;
        this.additionalLayers = [];
    }

    validate()
    {
        return this.optionsValidator.validate(this);
    }

    generate()
    {
        let nextLayerId = 5;
        this.generateEmptyMap();
        this.populateCollisionsMapBorder();
        this.generateInitialPath();
        this.placeElementsRandomly();
        this.connectPaths(mapGrid, pathLayerData, mapWidth, mapHeight, this.pathTile, mainPathStart, additionalLayers, this.collisionLayersForPaths);
        // apply variations after all the elements are displayed in the current map:
        let groundVariationsLayerData = Array(mapWidth * mapHeight).fill(0);
        this.applyVariations(groundVariationsLayerData, mapGrid, mapWidth, mapHeight, this.variableTilesPercentage, this.randomGroundTiles);

        let staticLayers = [
            {
                id: 1,
                data: groundLayerData,
                height: mapHeight,
                width: mapWidth,
                name: 'ground',
                type: 'tilelayer',
                visible: true,
                opacity: 1,
                x: 0,
                y: 0
            },{
                id: 2,
                data: collisionsMapBorderLayerData,
                height: mapHeight,
                width: mapWidth,
                name: 'collisions-map-border',
                type: 'tilelayer',
                visible: true,
                opacity: 1,
                x: 0,
                y: 0
            },{
                id: 3,
                data: pathLayerData,
                height: mapHeight,
                width: mapWidth,
                name: 'path',
                type: 'tilelayer',
                visible: true,
                opacity: 1,
                x: 0,
                y: 0
            },{
                id: 4,
                data: groundVariationsLayerData,
                height: mapHeight,
                width: mapWidth,
                name: 'ground-variations',
                type: 'tilelayer',
                visible: true,
                opacity: 1,
                x: 0,
                y: 0
            }
        ];

        let mergedLayers = mergeLayersByTileValue(staticLayers, additionalLayers);

        nextLayerId = mergedLayers.length + 1;

        // map template:
        const map = {
            backgroundcolor: '#000000',
            compressionlevel: 0,
            height: mapHeight,
            infinite: false,
            orientation: 'orthogonal',
            renderorder: 'right-down',
            tileheight: this.tileSize,
            tilewidth: this.tileSize,
            type: 'map',
            width: mapWidth,
            nextlayerid: nextLayerId,
            nextobjectid: 1,
            tilesets: [{
                columns: this.columns,
                firstgid: 1,
                image: this.tilesheetPath,
                imageheight: this.imageHeight,
                imagewidth: this.imageWidth,
                margin: this.margin,
                name: 'tilesheet',
                spacing: this.spacing,
                tilecount: this.tileCount,
                tileheight: this.tileSize,
                tilewidth: this.tileSize
            }],
            layers: [...mergedLayers]
        };

        // save the map in a JSON file:
        fs.writeFile(this.mapFileName, this.mapToJSON(map), 'utf8', (err) => {
            if (err) {
                console.error('Error saving the map:', err);
                return;
            }
            console.log('The map has been saved!');
        });

    }

    generateInitialPath()
    {
        if(!this.generateElementsPath){
            return false;
        }
        this.pathLayerData = Array(this.mapWidth * this.mapHeight).fill(0);
        this.nextLayerId++;
        // starting point for the path to each element:
        this.placeMainPath();
    }

    generateEmptyMap()
    {
        const {mapWidth, mapHeight} = this.calculateMapSizeWithFreeSpace();
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.mapGrid = Array.from({length: mapHeight}, () => Array(mapWidth).fill(true));
        if (0 === this.groundTile) {
            this.groundLayerData = Array(mapWidth * mapHeight).fill(this.groundTile);
            this.nextLayerId++;
        }
        return {mapWidth, mapHeight, mapGrid: this.mapGrid, groundLayerData: this.groundLayerData};
    }

    calculateMapSizeWithFreeSpace(layerElements, elementsQuantity, freeSpaceTilesQuantity)
    {
        layerElements = layerElements || this.layerElements;
        if (!layerElements) {
            Logger.error('No layer elements defined.');
            return false;
        }
        elementsQuantity = elementsQuantity || this.elementsQuantity;
        if (!elementsQuantity) {
            Logger.error('No layer elements quantity defined.');
            return false;
        }
        freeSpaceTilesQuantity = freeSpaceTilesQuantity || this.freeSpaceTilesQuantity || 0;
        let totalArea = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        // calculate total area required by elements, including free space:
        for (let elementType of Object.keys(elementsQuantity)) {
            const quantity = elementsQuantity[elementType];
            // assuming first layer represents size:
            const element = layerElements[elementType][0];
            let widthPlusFreeTiles = element.width + freeSpaceTilesQuantity * 2;
            let heightPlusFreeTiles = element.height + freeSpaceTilesQuantity * 2;
            const elementArea = widthPlusFreeTiles * heightPlusFreeTiles * quantity;
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
        for (let elementType of Object.keys(this.layerElements)) {
            for (let layer of this.layerElements[elementType]) {
                // check if layer name is unique
                if (!addedLayerNames.has(layer.name)) {
                    // fill layer with empty tiles:
                    let layerData = Array(this.mapWidth * this.mapHeight).fill(0);
                    this.additionalLayers.push({
                        id: this.nextLayerId++,
                        data: layerData,
                        height: this.mapHeight,
                        width: this.mapWidth,
                        name: layer.name,
                        type: 'tilelayer',
                        visible: true,
                        opacity: 1,
                        x: 0,
                        y: 0
                    });
                    // mark this layer name as added:
                    addedLayerNames.add(layer.name);
                }
            }
        }
    }

    findRandomPosition(mapGrid, width, height)
    {
        const maxTries = 100;
        let tries = 0;
        while (tries < maxTries) {
            const x = Math.floor(Math.random() * (mapGrid[0].length - width));
            const y = Math.floor(Math.random() * (mapGrid.length - height));
            if (this.canPlaceElement(mapGrid, x, y, width, height)) {
                return { x, y };
            }
            tries++;
        }
        return null;
    }

    canPlaceElement(mapGrid, x, y, width, height)
    {
        for (let i = y; i < y + height; i++) {
            for (let j = x; j < x + width; j++) {
                if (!mapGrid[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }

    updateLayerData(mapGrid, additionalLayers, elementData, position)
    {
        const layerIndex = additionalLayers.findIndex(layer => layer.name === elementData.name);
        if (layerIndex === -1) {
            return;
        }
        const layer = additionalLayers[layerIndex];
        for (let i = 0; i < elementData.height; i++) {
            for (let j = 0; j < elementData.width; j++) {
                const tileIndex = i * elementData.width + j;
                const mapIndex = (position.y + i) * mapWidth + (position.x + j);
                if (elementData.data[tileIndex] !== 0) {
                    layer.data[mapIndex] = elementData.data[tileIndex];
                    mapGrid[position.y + i][position.x + j] = false;
                }
            }
        }
    }

    placeElementsRandomly()
    {
        this.generateAdditionalLayers();
        for(let elementType of Object.keys(this.elementsQuantity)){
            for(let q = 0; q < this.elementsQuantity[elementType]; q++){
                const elementDataArray = this.layerElements[elementType];
                // use the base layer to find a position:
                const baseElementData = elementDataArray[0];
                const position = this.findRandomPosition(this.mapGrid, baseElementData.width, baseElementData.height);
                if (position) {
                    for (let elementData of elementDataArray) {
                        elementData.position = position;
                        // update each layer with the elements tiles at the determined position:
                        this.updateLayerData(this.mapGrid, this.additionalLayers, elementData, position);
                    }
                }
            }
        }
        // filter out layers without any tiles set:
        this.additionalLayers = this.additionalLayers.filter(layer => layer.data.some(tile => tile !== 0));
    }

    applyVariations(variationsLayer, mapGrid, width, height, percentage, variations)
    {
        const totalTiles = mapGrid.flat().filter(tile => tile === true).length;
        const tilesToChange = Math.floor(totalTiles * (percentage / 100));

        for (let i = 0, applied = 0; applied < tilesToChange && i < totalTiles * 2; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const position = y * width + x;

            if (mapGrid[y][x]) {
                variationsLayer[position] = variations[Math.floor(Math.random() * variations.length)];
                applied++;
            }
        }
    }

    placeMainPath()
    {
        // randomly choose an edge (top=0, right=1, bottom=2, left=3):
        switch (Math.floor(Math.random() * 4)) {
            case 0: // top edge
                this.pathStartX = Math.floor(Math.random() * (this.mapWidth - this.mainPathSize));
                this.pathStartY = 0;
                break;
            case 1: // right edge
                this.pathStartX = this.mapWidth - 1;
                this.pathStartY = Math.floor(Math.random() * (this.mapHeight - this.mainPathSize));
                break;
            case 2: // bottom edge
                this.pathStartX = Math.floor(Math.random() * (this.mapWidth - this.mainPathSize));
                this.pathStartY = this.mapHeight - 1;
                break;
            case 3: // left edge
                this.pathStartX = 0;
                this.pathStartY = Math.floor(Math.random() * (this.mapHeight - this.mainPathSize));
                break;
        }
        // @TODO - Refactor.
        for(let i = 0; i < this.mainPathSize; i++){
            let x = this.pathStartX;
            let y = this.pathStartY;
            if (this.pathStartY === 0 || this.pathStartY === this.mapHeight - 1) { // top or bottom edge
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
        if(!this.blockMapBorder || 0 === this.borderTile){
            this.borderLayer = false;
            return false;
        }
        this.borderLayer = Array(this.mapWidth * this.mapHeight).fill(0);
        this.nextLayerId++;
        for (let x = 0; x < this.mapWidth; x++) {
            // top border:
            this.borderLayer[x] = this.groundTile;
            // bottom border:
            this.borderLayer[(this.mapHeight - 1) * this.mapWidth + x] = this.groundTile;
        }
        for (let y = 0; y < this.mapHeight; y++) {
            // left border:
            this.borderLayer[y * this.mapWidth] = this.groundTile;
            // right border:
            this.borderLayer[y * this.mapWidth + (this.mapWidth - 1)] = this.groundTile;
        }
        if(this.isBorderWalkable){
            return this.borderLayer;
        }
        // mark the border as occupied in the mapGrid
        for (let x = 0; x < this.mapWidth; x++) {
            this.mapGrid[0][x] = false;
            this.mapGrid[this.mapHeight - 1][x] = false;
        }
        for (let y = 0; y < this.mapHeight; y++) {
            this.mapGrid[y][0] = false;
            this.mapGrid[y][this.mapWidth - 1] = false;
        }
        return this.borderLayer;
    }

    mergeLayersByTileValue(staticLayers, additionalLayers)
    {
        let combinedLayers = [...staticLayers, ...additionalLayers];
        // Use a map to track merged layers by name.
        let mergedLayersByName = new Map();

        combinedLayers.forEach(layer => {
            // If the layer has already been encountered, merge their data.
            if (mergedLayersByName.has(layer.name)) {
                let existingLayer = mergedLayersByName.get(layer.name);
                // Merge data arrays, preferring non-zero values.
                existingLayer.data = existingLayer.data.map((tile, index) => tile > 0 ? tile : layer.data[index]);
            } else {
                // Clone the layer to avoid mutating the original objects.
                let clonedLayer = JSON.parse(JSON.stringify(layer));
                mergedLayersByName.set(layer.name, clonedLayer);
            }
        });

        // Convert the merged layers back into an array.
        return Array.from(mergedLayersByName.values());
    }

    findPathTilePositions(layerData, layerWidth, layerHeight, pathTile)
    {
        let tilesFound = []
        for (let y = 0; y < layerHeight; y++) {
            for (let x = 0; x < layerWidth; x++) {
                const index = y * layerWidth + x;
                if (layerData[index] === pathTile) {
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

    isBorder(pathTilePosition, mapWidth, mapHeight)
    {
        return 0 >= pathTilePosition.x
            || 0 >= pathTilePosition.y
            || mapWidth === pathTilePosition.x
            || mapHeight === pathTilePosition.y;
    }

    getMovementDirection(previousPoint2, previousPoint1, point)
    {
        // determine vertical direction from previousPoint2 to previousPoint1
        let verticalDirection = '';
        if (previousPoint1[1] > previousPoint2[1]) {
            verticalDirection = 'down';
        } else if (previousPoint1[1] < previousPoint2[1]) {
            verticalDirection = 'top';
        }
        // determine horizontal direction from previousPoint1 to point
        let horizontalDirection = '';
        if (point[0] > previousPoint1[0]) {
            horizontalDirection = 'right';
        } else if (point[0] < previousPoint1[0]) {
            horizontalDirection = 'left';
        }
        // combine the directions
        // ensure we only add '-' if both directions are present
        return `${verticalDirection}${verticalDirection && horizontalDirection ? '-' : ''}${horizontalDirection}`;
    }

    fixHorizontalPaths(previousPoint, point, mapWidth, pathLayerData, pathTile, mapHeight)
    {
        let horizontalChanged = previousPoint[0] !== point[0];
        if (horizontalChanged) {
            let previousTopY = previousPoint[1] - 1;
            let previousTopX = previousPoint[0];
            let previousTopIndex = this.tileIndexByRowAndColumn(previousTopY, previousTopX, mapWidth);
            let previousBottomY = previousPoint[1] + 1;
            let previousBottomX = previousPoint[0];
            let previousBottomIndex = this.tileIndexByRowAndColumn(previousBottomY, previousBottomX, mapWidth);
            if (pathLayerData[previousTopIndex] !== pathTile && !isBorder({
                x: previousTopX,
                y: previousTopY
            }, mapWidth, mapHeight)) {
                pathLayerData[previousTopIndex] = this.surroundingTiles['-1,0'];
            }
            if (pathLayerData[previousBottomIndex] !== pathTile && !this.isBorder({
                x: previousBottomX,
                y: previousBottomY
            }, mapWidth, mapHeight)) {
                pathLayerData[previousBottomIndex] = this.surroundingTiles['1,0'];
            }
        }
        return horizontalChanged;
    }

    fixVerticalPaths(previousPoint, point, mapWidth, pathLayerData, pathTile, mapHeight)
    {
        let verticalChanged = previousPoint[1] !== point[1];
        if (verticalChanged) {
            let previousLeftY = previousPoint[1];
            let previousLeftX = previousPoint[0] - 1;
            let previousLeftIndex = this.tileIndexByRowAndColumn(previousLeftY, previousLeftX, mapWidth);
            let previousRightY = previousPoint[1];
            let previousRightX = previousPoint[0] + 1;
            let previousRightIndex = this.tileIndexByRowAndColumn(previousRightY, previousRightX, mapWidth);
            if (pathLayerData[previousLeftIndex] !== pathTile && !this.isBorder({
                x: previousLeftX,
                y: previousLeftY
            }, mapWidth, mapHeight)) {
                pathLayerData[previousLeftIndex] = this.surroundingTiles['0,-1'];
            }
            if (pathLayerData[previousRightIndex] !== pathTile && !this.isBorder({
                x: previousRightX,
                y: previousRightY
            }, mapWidth, mapHeight)) {
                pathLayerData[previousRightIndex] = this.surroundingTiles['0,1'];
            }
        }
        return verticalChanged;
    }

    replaceSequence(array, originalSequence, replaceSequence)
    {
        const originalSeqArray = originalSequence.split(',').map(Number);
        const replaceSeqArray = replaceSequence.split(',').map(Number);

        for (let i = 0; i <= array.length - originalSeqArray.length; i++) {
            if (array.slice(i, i + originalSeqArray.length).every((value, index) => value === originalSeqArray[index])) {
                array.splice(i, originalSeqArray.length, ...replaceSeqArray);
            }
        }
        return array;
    }

    applySurroundingPaths(point, mapHeight, mapWidth, pathLayerData, pathTile)
    {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (j === 0 && i === 0) {
                    continue;
                }
                let increasedPointY = point[1] + i;
                if (this.isInvalidMapPointY(increasedPointY, mapHeight)) {
                    increasedPointY = point[1];
                }
                let increasedPointX = point[0] + j;
                if (this.isInvalidMapPointX(increasedPointX, mapWidth)) {
                    increasedPointX = point[0];
                }
                if (this.isBorder({x: increasedPointX, y: increasedPointY}, mapWidth, mapHeight)) {
                    continue;
                }
                let nodeIndex = this.tileIndexByRowAndColumn(increasedPointY, increasedPointX, mapWidth);
                if (0 === pathLayerData[nodeIndex]) {
                    // this MUST BE different to the pathTile
                    let surroundingTile = this.surroundingTiles[`${i},${j}`];
                    if (surroundingTile && surroundingTile !== pathTile) {
                        pathLayerData[nodeIndex] = surroundingTile;
                    }
                }
            }
        }
    }

    connectPaths(mapGrid, pathLayerData, mapWidth, mapHeight, pathTile, mainPathStart, additionalLayers, collisionLayersForPaths)
    {
        let grid = this.createPathfindingGrid(additionalLayers, mapWidth, mapHeight, collisionLayersForPaths);
        for (let layer of additionalLayers) {
            if (layer.name !== 'path') {
                continue;
            }
            const pathTilePositions = this.findPathTilePositions(layer.data, mapWidth, mapHeight, pathTile);
            for (let pathTilePosition of pathTilePositions) {
                if (this.isBorder(pathTilePosition, mapWidth, mapHeight)) {
                    continue;
                }
                let path = this.findPath(mainPathStart, pathTilePosition, mapWidth, mapHeight, grid);
                let previousPoint = false;
                let pointIndex = 0;
                for (let point of path) {
                    const indexPoint = point[1] * mapWidth + point[0];
                    pathLayerData[indexPoint] = pathTile; // Mark the path
                    mapGrid[point[1]][point[0]] = false; // Mark as occupied

                    this.applySurroundingPaths(point, mapHeight, mapWidth, pathLayerData, pathTile);

                    if (0 === pointIndex) {
                        previousPoint = point;
                        pointIndex++;
                        continue
                    }

                    this.fixHorizontalPaths(previousPoint, point, mapWidth, pathLayerData, pathTile, mapHeight);

                    this.fixVerticalPaths(previousPoint, point, mapWidth, pathLayerData, pathTile, mapHeight);

                    previousPoint = point;
                    pointIndex++;
                }
            }
        }
        this.replaceSequence(pathLayerData, '121,0,121', '121,121,121');
        this.replaceSequence(pathLayerData, '121,129,121', '121,121,121');
        this.replaceSequence(pathLayerData, '121,129,0', '121,129,0');
        this.replaceSequence(pathLayerData, '121,126,121', '121,121,121');
        this.replaceSequence(pathLayerData, '127,127', '127,124');
        this.replaceSequence(pathLayerData, '132,132', '132,131');
        this.replaceSequence(pathLayerData, '121,131,131', '121,282,131');
        this.replaceSequence(pathLayerData, '127,121', '126,121');
        this.replaceSequence(pathLayerData, '124,121', '126,121');
        this.replaceSequence(pathLayerData, '133,133', '131,133');
        this.replaceSequence(pathLayerData, '130,120', '124,130');
        this.replaceSequence(pathLayerData, '131,121', '283,121');
        this.replaceSequence(pathLayerData, '124,126', '124,285');
        this.replaceSequence(pathLayerData, '131,126', '131,283');
        this.replaceSequence(pathLayerData, '127,126', '127,285');
        this.replaceSequence(pathLayerData, '121,124,130', '121,284,130');
        this.replaceSequence(pathLayerData, '130,130', '124,130');
        this.replaceSequence(pathLayerData, '132,126', '132,283');
        this.replaceSequence(pathLayerData, '127,126', '127,285');
        this.replaceSequence(pathLayerData, '121,126,121', '121,121,121');
        this.replaceSequence(pathLayerData, '121,131,131', '121,282,131');
        this.replaceSequence(pathLayerData, '121,130,0', '121,129,0');
        this.replaceSequence(pathLayerData, '121,130,121', '121,121,121');
        this.replaceSequence(pathLayerData, '121,124,124', '121,284,124');
        this.replaceSequence(pathLayerData, '121,129,130', '121,284,130');
        this.replaceSequence(pathLayerData, '129,124', '284,124');
        this.replaceSequence(pathLayerData, '130,124', '124,124');
        this.replaceSequence(pathLayerData, '284,124,283', '121,121,121');
        this.replaceSequence(pathLayerData, '129,133', '282,133');
        this.replaceSequence(pathLayerData, '129,131', '282,131');
        this.replaceSequence(pathLayerData, '121,131,133', '121,282,133');
        this.replaceSequence(pathLayerData, '121,131', '121,282');
        this.replaceSequence(pathLayerData, '121,133', '121,129');
        this.replaceSequence(pathLayerData, '121,124', '121,284');
        this.replaceSequence(pathLayerData, '132,121', '126,121');
    }

    createPathfindingGrid(additionalLayers, mapWidth, mapHeight, collisionLayersForPaths)
    {
        let grid = new Grid(mapWidth, mapHeight);
        for (let layer of additionalLayers) {
            let isCollisionsLayer = false;
            for (let collisionLayer of collisionLayersForPaths) {
                if (-1 !== layer.name.indexOf(collisionLayer)) {
                    isCollisionsLayer = true;
                }
            }
            for(let c = 0; c < mapWidth; c++){
                for(let r = 0; r < mapHeight; r++){
                    let tileIndex = this.tileIndexByRowAndColumn(r, c, mapWidth);
                    let tile = layer.data[tileIndex];
                    let isZeroTile = 0 === Number(tile);
                    let isCollisionBody = !isZeroTile && isCollisionsLayer;
                    this.markPathFinderTile(layer, isZeroTile, isCollisionBody, c, r, grid);
                }
            }
        }
        return grid;
    }

    tileIndexByRowAndColumn(r, c, mapWidth)
    {
        return r * mapWidth + c;
    }

    markPathFinderTile(layer, isZeroTile, isCollisionBody, c, r, grid)
    {
        let hasBody = !isZeroTile && isCollisionBody;
        if(!hasBody){
            return;
        }
        grid.setWalkableAt(c, r, false);
    }

    findPath(start, end, mapWidth, mapHeight, grid)
    {
        let finder = new AStarFinder();
        let gridClone = grid.clone();
        return finder.findPath(start.x, start.y, end.x, end.y, gridClone);
    }

    mapToJSON(map)
    {
        let jsonString = JSON.stringify(map, null, 4);
        const dataPattern = /("data":\s*\[\n\s*)([\s\S]*?)(\n\s*\])/g;

        return jsonString.replace(dataPattern, (match, start, dataArray, end) => {
            const singleLineArray = dataArray.replace(/\s+/g, '');
            return `${start.trim()}${singleLineArray}${end.trim()}`;
        });
    }
}

module.exports.RandomMapGenerator = RandomMapGenerator;
