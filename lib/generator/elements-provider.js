/**
 *
 * Reldens - Tile Map Generator - ElementsProvider
 *
 */

const { PropertiesMapper } = require('./properties-mapper');
const { JsonFormatter } = require('../map/json-formatter');
const { FileHandler } = require('../files/file-handler');
const { TileMapOptimizer } = require('@reldens/tile-map-optimizer');
const { Logger, sc } = require('@reldens/utils');

class ElementsProvider
{

    constructor(props)
    {
        this.elementsLayers = [];
        this.tileMapJSON = sc.get(props, 'tileMapJSON', null);
        this.currentDate = sc.getDateForFileName();
        this.defaultMapFileName = `elements-${this.currentDate}`;
        this.mapFileName = sc.get(props, 'mapFileName', this.defaultMapFileName);
        this.factor = sc.get(props, 'factor', 1);
        this.transparentColor = sc.get(props, 'transparentColor', '#000000');
        this.rootFolder = sc.get(props, 'rootFolder', __dirname);
        this.fileHandler = new FileHandler();
        this.writeCroppedElementsFiles = sc.get(props, 'writeCroppedElementsFiles', false);
        this.expandElementsSize = sc.get(props, 'expandElementsSize', 0);
        this.tileMapOptimizer = null;
        this.croppedElements = {};
        this.elementsQuantity = {};
        this.specialLayers = ['ground', 'path', 'ground-variations', 'borders'];
        this.propertiesMapper = new PropertiesMapper();
        this.groundTile = 0;
        this.groundTiles = [];
        this.randomGroundTiles = [];
        this.bordersTiles = {};
    }

    async splitElements()
    {
        await this.optimizeMap();
        this.elementsLayers = this.splitByLayerName();
        this.croppedElements = {};
        for(let i of Object.keys(this.elementsLayers)){
            if(this.isSpecialLayerByKey(i)){
                continue;
            }
            let elementLayers = this.elementsLayers[i];
            for (let layer of elementLayers){
                if(-1 !== layer.name.indexOf('path')){
                    layer.name = 'path';
                }
            }
            let mapClone = sc.deepJsonClone(this.optimizedMap);
            mapClone.layers = elementLayers;
            mapClone = this.cropMapToMinimumArea(mapClone);
            if (0 < this.expandElementsSize) {
                this.expandLayers(mapClone.layers);
            }
            this.croppedElements[i] = mapClone.layers;
            if(this.writeCroppedElementsFiles){
                Logger.info('Writing cropped elements file: '+i+'.json');
                await this.fileHandler.writeFile(
                    this.fileHandler.joinPaths(this.rootFolder, 'generated', i+'.json'),
                    JsonFormatter.mapToJSON(mapClone));
            }
        }
    }

    expandLayers(layers)
    {
        for (let layer of layers) {
            let { data, width, height } = layer;
            // calculate new dimensions, the x2 is to center the element:
            const newWidth = width + 2 * this.expandElementsSize;
            const newHeight = height + 2 * this.expandElementsSize;
            let newData = new Array(newWidth * newHeight).fill(0);
            for (let row = 0; row < height; row++) {
                for (let col = 0; col < width; col++) {
                    let newIndex = (row + this.expandElementsSize) * newWidth + (col + this.expandElementsSize);
                    let originalIndex = row * width + col;
                    newData[newIndex] = data[originalIndex];
                }
            }
            // update the layer with the new properties:
            layer.data = newData;
            layer.width = newWidth;
            layer.height = newHeight;
        }
        return layers;
    }

    isSpecialLayerByKey(key)
    {
        return -1 !== this.specialLayers.indexOf(key);
    }

    splitByLayerName()
    {
        let elementsLayers = {};
        for(let layer of this.tileMapJSON.layers){
            let splitLayerName = layer.name.split('-');
            if(this.isSpecialLayerByKey(layer.name)){
                if('ground-variations' === layer.name){
                    this.randomGroundTiles = [...new Set(layer.data.filter((tile) => tile !== 0))];
                }
                continue;
            }
            if(3 > splitLayerName.length){
                Logger.error('Invalid layer name: '+layer.name+'. Expected: [elementName]-[index]-[layerName]');
                continue;
            }
            let elementLayerGroup = splitLayerName[0]+'-'+splitLayerName[1];
            if(!elementsLayers[elementLayerGroup]){
                elementsLayers[elementLayerGroup] = [];
            }
            if(layer.properties){
                for(let property of layer.properties){
                    if ('quantity' === property.name){
                        this.elementsQuantity[elementLayerGroup] = property.value;
                    }
                }
            }
            elementsLayers[elementLayerGroup].push(layer);
        }
        return elementsLayers;
    }

    cropMapToMinimumArea(map)
    {
        const boundingBox = this.findMinimumBoundingBox(map.layers);
        for(let layer of map.layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            const newData = [];
            for(let y = 0; y < boundingBox.height; y++){
                for(let x = 0; x < boundingBox.width; x++){
                    let oldIndex = (x + boundingBox.minX) + (y + boundingBox.minY) * layer.width;
                    newData.push(layer.data[oldIndex]);
                }
            }
            layer.data = newData;
            layer.width = boundingBox.width;
            layer.height = boundingBox.height;
        }
        map.width = boundingBox.width;
        map.height = boundingBox.height;
        return map;
    }

    findMinimumBoundingBox(layers)
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -1;
        let maxY = -1;
        for (let layer of layers) {
            if('tilelayer' !== layer.type){
                continue;
            }
            for (let y = 0; y < layer.height; y++) {
                for (let x = 0; x < layer.width; x++) {
                    let tileIndex = x + y * layer.width;
                    if (layer.data[tileIndex] !== 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
        }
        return {minX, minY, width: maxX - minX + 1, height: maxY - minY + 1};
    }

    async optimizeMap()
    {
        let options = {
            originalJSON: this.tileMapJSON,
            newName: 'optimized-'+this.mapFileName,
            factor: this.factor,
            transparentColor: this.transparentColor,
            rootFolder: this.rootFolder
        };
        this.tileMapOptimizer = new TileMapOptimizer(options);
        let output = await this.tileMapOptimizer.optimize();
        this.optimizedMap = output.newJSONResized || output.newJSON;
        this.fetchPathTiles();
    }

    fetchPathTiles()
    {
        if(!this.optimizedMap.tilesets[0].tiles){
            return;
        }
        let tileset = this.optimizedMap.tilesets[0];
        let tiles = tileset.tiles;
        this.propertiesMapper.reset();
        for(let tile of tiles){
            if(!sc.isArray(tile.properties)){
                continue;
            }
            for(let property of tile.properties){
                if('key' !== property.name){
                    continue;
                }
                let newTileId = tileset.firstgid + tile.id;
                if (!newTileId){
                    continue;
                }
                if('pathTile' === property.value){
                    this.pathTile = newTileId;
                }
                if(0 === this.groundTile && 'groundTile' === property.value){
                    this.groundTile = newTileId;
                }
                if(0 !== this.groundTile && 'groundTile' === property.value && this.groundTile !== newTileId) {
                    this.groundTiles.push(newTileId);
                }
                if (-1 !== property.value.indexOf('border-')) {
                    this.bordersTiles[property.value.replace('border-', '')] = newTileId;
                }
                if (-1 === property.value.indexOf('corner-')) {
                    this.propertiesMapper.mapSurroundingByKey(property.value, newTileId);
                    continue;
                }
                let cornerKey = property.value;
                this.propertiesMapper.mapCornersByKey(cornerKey.replace('corner-', ''), newTileId);
            }
        }
        if (0 < this.groundTiles.length) {
            if (0 !== this.groundTile && -1 === this.groundTiles.indexOf(this.groundTile)) {
                this.groundTiles.push(this.groundTile);
            }
            if (-1 !== this.groundTiles.indexOf(0)) {
                this.groundTiles.splice(this.groundTiles.indexOf(0), 1);
            }
            this.groundTile = 0;
        }
        this.surroundingTiles = this.propertiesMapper.surroundingTiles;
        this.corners = this.propertiesMapper.corners;
    }

}

module.exports.ElementsProvider = ElementsProvider;
