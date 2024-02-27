/**
 *
 * Reldens - Tile Map Generator - ElementsProvider
 *
 */

const fs = require('fs');
const { TiledMapOptimizer } = require('@reldens/tile-map-optimizer');
const { Logger, sc } = require('@reldens/utils');

class ElementsProvider
{

    constructor(props)
    {
        this.elements = [];
        this.tileMapJSON = sc.get(props, 'map', null);
        this.originalMapFileName = sc.get(props, 'originalMapFileName', 'reldens-town');
        this.factor = sc.get(props, 'factor', 2);
        this.transparentColor = sc.get(props, 'transparentColor', '#000000');
        this.rootFolder = sc.get(props, 'rootFolder', __dirname);
    }

    async splitElements()
    {
        this.optimizedMap = await this.optimizeMap();
        this.elementsLayers = this.splitByLayerName();
        for(let i of Object.keys(this.elementsLayers)){
            let elementLayers = this.elementsLayers[i];
            let mapClone = Object.assign({}, this.optimizedMap);
            mapClone.layers = elementLayers;
            mapClone = this.cropMapToMinimumArea(mapClone);
            fs.writeFileSync(i+'.json', JSON.stringify(mapClone));
        }
    }

    splitByLayerName()
    {
        let elementsLayers = {};
        for(let layer of this.tileMapJSON.layers){
            let splitLayerName = layer.name.split('-');
            if (3 > splitLayerName.length){
                Logger.error('Invalid layer name: '+layer.name+'. Expected: <elementName>-<index>-<layerName>');
                continue;
            }
            let elementLayerGroup = splitLayerName[0]+'-'+splitLayerName[1];
            if(!elementsLayers[elementLayerGroup]){
                elementsLayers[elementLayerGroup] = [];
            }
            elementsLayers[elementLayerGroup].push(layer);
        }
        return elementsLayers;
    }

    cropMapToMinimumArea(map)
    {
        const boundingBox = this.findMinimumBoundingBox(map.layers);
        for (let layer of map.layers) {
            if (layer.type !== 'tilelayer') continue;
            const newData = [];
            for (let y = 0; y < boundingBox.height; y++) {
                for (let x = 0; x < boundingBox.width; x++) {
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
        this.tileMapOptimizer = new TiledMapOptimizer(options);
        return this.tileMapOptimizer.generate();
    }

}

module.exports.ElementsProvider = ElementsProvider;
