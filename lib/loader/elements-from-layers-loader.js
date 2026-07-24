/**
 *
 * Reldens - Tile Map Generator - ElementsFromLayersLoader
 *
 * Parses a Tiled-format map JSON whose layers follow the generator's
 * "{elementName}-{index}-{layerType}" naming convention and returns the placed elements
 * grouped by instance id, with each element's per-layer tiles and a computed bounding box.
 *
 */

const { ElementLayerName } = require('../map/element-layer-name');
const { Logger, sc } = require('@reldens/utils');

class ElementsFromLayersLoader
{

    constructor()
    {
        /** @type {string} */
        this.defaultBordersLayer = 'borders';
        /** @type {Array<string>} */
        this.skipLayerNames = ['ground', 'ground-variations', 'borders', 'change-points'];
        /** @type {Array<string>} */
        this.skipLayerPrefixes = ['spot-layer-'];
        this.elementLayerName = new ElementLayerName();
    }

    /**
     * @param {Object} mapJson
     * @returns {Object}
     */
    load(mapJson)
    {
        if(!sc.isObject(mapJson)){
            Logger.error('MapElementsFromLayersLoader.load called without mapJson.');
            return {elements: [], bordersLayer: this.defaultBordersLayer, warnings: ['no-map-json']};
        }
        let warnings = [];
        let groups = {};
        let bordersLayer = this.defaultBordersLayer;
        let layers = sc.isArray(mapJson.layers) ? mapJson.layers : [];
        if(0 === layers.length){
            warnings.push('no-layers');
            return {elements: [], bordersLayer, warnings};
        }
        let mapWidth = Number(sc.get(mapJson, 'width', 0));
        for(let layer of layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            if(this.defaultBordersLayer === layer.name){
                bordersLayer = layer.name;
            }
            if(this.shouldSkipLayer(layer.name)){
                continue;
            }
            let parsed = this.elementLayerName.parse(layer.name);
            if(!parsed){
                continue;
            }
            this.appendToGroup(groups, parsed, layer, mapWidth);
        }
        let elements = [];
        for(let instanceId of Object.keys(groups)){
            let element = groups[instanceId];
            element.bounds = this.computeBounds(element.layers);
            elements.push(element);
        }
        if(0 === elements.length){
            warnings.push('no-elements-detected');
        }
        return {elements, bordersLayer, warnings};
    }

    /**
     * @param {Object} groups
     * @param {Object} parsed
     * @param {Object} layer
     * @param {number} mapWidth
     */
    appendToGroup(groups, parsed, layer, mapWidth)
    {
        let group = groups[parsed.instanceId];
        if(!group){
            group = {
                instanceId: parsed.instanceId,
                elementKey: parsed.base,
                index: parsed.index,
                layers: []
            };
            groups[parsed.instanceId] = group;
        }
        group.layers.push(this.buildElementLayer(layer, parsed.layerType, mapWidth));
    }

    /**
     * @param layer
     * @returns {boolean}
     */
    isSpotLayer(layer)
    {
        if('tilelayer' !== layer.type){
            return false;
        }
        if(this.shouldSkipLayer(layer.name)){
            return false;
        }
        return null === this.elementLayerName.parse(layer.name);
    }

    /**
     * @param {string} layerName
     * @returns {boolean}
     */
    shouldSkipLayer(layerName)
    {
        if(!sc.isString(layerName)){
            return true;
        }
        if(0 === layerName.length){
            return true;
        }
        if(sc.inArray(layerName, this.skipLayerNames)){
            return true;
        }
        for(let prefix of this.skipLayerPrefixes){
            if(sc.startsWith(layerName, prefix)){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Object} layer
     * @param {string} layerType
     * @param {number} mapWidth
     * @returns {Object}
     */
    buildElementLayer(layer, layerType, mapWidth)
    {
        let tiles = [];
        let data = sc.isArray(layer.data) ? layer.data : [];
        for(let i = 0; i < data.length; i++){
            let gid = Number(data[i]);
            if(0 === gid){
                continue;
            }
            tiles.push({
                col: i % mapWidth,
                row: Math.floor(i / mapWidth),
                gid
            });
        }
        return {name: layer.name, type: layerType, tiles};
    }

    /**
     * @param {Array<Object>} elementLayers
     * @returns {Object}
     */
    computeBounds(elementLayers)
    {
        let acc = {minCol: 0, minRow: 0, maxCol: 0, maxRow: 0, hasTiles: false};
        for(let layer of elementLayers){
            this.extendBoundsFromLayer(acc, layer);
        }
        if(!acc.hasTiles){
            return {col: 0, row: 0, width: 0, height: 0};
        }
        return {
            col: acc.minCol,
            row: acc.minRow,
            width: acc.maxCol - acc.minCol + 1,
            height: acc.maxRow - acc.minRow + 1
        };
    }

    /**
     * @param {Object} acc
     * @param {Object} layer
     */
    extendBoundsFromLayer(acc, layer)
    {
        for(let tile of layer.tiles){
            if(!acc.hasTiles){
                acc.minCol = tile.col;
                acc.maxCol = tile.col;
                acc.minRow = tile.row;
                acc.maxRow = tile.row;
                acc.hasTiles = true;
                continue;
            }
            if(acc.minCol > tile.col){
                acc.minCol = tile.col;
            }
            if(acc.minRow > tile.row){
                acc.minRow = tile.row;
            }
            if(acc.maxCol < tile.col){
                acc.maxCol = tile.col;
            }
            if(acc.maxRow < tile.row){
                acc.maxRow = tile.row;
            }
        }
    }
}

module.exports.ElementsFromLayersLoader = ElementsFromLayersLoader;
