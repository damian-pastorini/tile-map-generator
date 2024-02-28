/**
 *
 * Reldens - Tile Map Generator - ElementsProvider
 *
 */

const { PropertiesMapper } = require('./properties-mapper');
const { FileHandler } = require('../files/file-handler');
const { JsonFormatter } = require('../map/json-formatter');
const { TileMapOptimizer } = require('@reldens/tile-map-optimizer');
const { Logger, sc } = require('@reldens/utils');

class ElementsProvider
{

    constructor(props)
    {
        this.elementsLayers = [];
        this.tileMapJSON = sc.get(props, 'map', null);
        this.currentDate = (new Date()).toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-');
        this.defaultMapFileName = `elements-map-${this.currentDate}.json`;
        this.originalMapFileName = sc.get(props, 'originalMapFileName', this.defaultMapFileName);
        this.factor = sc.get(props, 'factor', 2);
        this.transparentColor = sc.get(props, 'transparentColor', '#000000');
        this.rootFolder = sc.get(props, 'rootFolder', __dirname);
        this.fileHandler = new FileHandler();
        this.writeCroppedElementsFiles = sc.get(props, 'writeCroppedElementsFiles', false);
        this.tileMapOptimizer = null;
        this.croppedElements = {};
        this.elementsQuantity = {};
        this.specialLayers = ['ground', 'path', 'ground-variations'];
        this.propertiesMapper = new PropertiesMapper();
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
            let mapClone = Object.assign({}, this.optimizedMap);
            mapClone.layers = elementLayers;
            mapClone = this.cropMapToMinimumArea(mapClone);
            this.croppedElements[i] = mapClone.layers;
            if(this.writeCroppedElementsFiles){
                this.fileHandler.writeFile(i+'.json', JsonFormatter.mapToJSON(mapClone));
            }
        }
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
                Logger.error('Invalid layer name: '+layer.name+'. Expected: <elementName>-<index>-<layerName>');
                continue;
            }
            let elementLayerGroup = splitLayerName[0]+'-'+splitLayerName[1];
            if(!elementsLayers[elementLayerGroup]){
                elementsLayers[elementLayerGroup] = [];
            }
            if(layer.properties){
                for (let property of layer.properties){
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
            if ('tilelayer' !== layer.type) continue;
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
            originalMapFileName: this.originalMapFileName,
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
        let tiles = this.optimizedMap.tilesets[0].tiles;
        this.propertiesMapper.reset();
        for(let tile of tiles){
            if(!sc.isArray(tile.properties)){
                continue;
            }
            for(let property of tile.properties){
                if('key' !== property.name){
                    continue;
                }
                if('pathTile' === property.value){
                    this.pathTile = tile.id;
                }
                if('groundTile' === property.value){
                    this.groundTile = tile.id;
                }
                this.propertiesMapper.mapByKey(property.value, tile.id);
            }
        }
        this.surroundingTiles = this.propertiesMapper.surroundingTiles;
        this.corners = this.propertiesMapper.corners;
    }

}

module.exports.ElementsProvider = ElementsProvider;
