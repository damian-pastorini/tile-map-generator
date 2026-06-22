/**
 *
 * Reldens - Tile Map Generator - ElementsToLayersBuilder
 *
 * Inverse of ElementsFromLayersLoader: rebuilds the element layers of a Tiled mapJson from an
 * element record. Static layers are kept in place; every element layer is rebuilt from the
 * record's per-instance tiles, in record order (so the layer order matches the editor sort).
 *
 */

const { ElementsFromLayersLoader } = require('../loader/elements-from-layers-loader');
const { LayerDataFactory } = require('./layer-data-factory');
const { sc } = require('@reldens/utils');

class ElementsToLayersBuilder
{

    constructor()
    {
        this.layerDataFactory = new LayerDataFactory();
    }

    /**
     * @param {Object} mapJson
     * @param {Object} mapElements
     * @returns {Object}
     */
    apply(mapJson, mapElements)
    {
        if(!mapJson || !mapElements || !sc.isArray(mapElements.elements)){
            return mapJson;
        }
        let mapWidth = Number(sc.get(mapJson, 'width', 0));
        let mapHeight = Number(sc.get(mapJson, 'height', 0));
        let elementLayers = this.buildElementLayers(mapElements.elements, mapWidth, mapHeight);
        mapJson.layers = this.mergeStaticAndElementLayers(mapJson.layers, elementLayers);
        return mapJson;
    }

    /**
     * @param {Array<Object>} elements
     * @param {number} mapWidth
     * @param {number} mapHeight
     * @returns {Array<Object>}
     */
    buildElementLayers(elements, mapWidth, mapHeight)
    {
        let layers = [];
        for(let element of elements){
            this.appendElementLayers(element, layers, mapWidth, mapHeight);
        }
        return layers;
    }

    /**
     * @param {Object} element
     * @param {Array<Object>} layers
     * @param {number} mapWidth
     * @param {number} mapHeight
     */
    appendElementLayers(element, layers, mapWidth, mapHeight)
    {
        for(let elementLayer of element.layers){
            layers.push(this.buildElementLayer(elementLayer, mapWidth, mapHeight));
        }
    }

    /**
     * @param {Object} elementLayer
     * @param {number} mapWidth
     * @param {number} mapHeight
     * @returns {Object}
     */
    buildElementLayer(elementLayer, mapWidth, mapHeight)
    {
        let data = this.layerDataFactory.createEmptyLayerData(mapWidth, mapHeight);
        this.layerDataFactory.writeTilesToData(data, elementLayer.tiles, mapWidth, tile => tile.gid);
        return {
            name: elementLayer.name,
            type: 'tilelayer',
            width: mapWidth,
            height: mapHeight,
            visible: true,
            opacity: 1,
            x: 0,
            y: 0,
            data
        };
    }

    /**
     * @param {Array<Object>} originalLayers
     * @param {Array<Object>} elementLayers
     * @returns {Array<Object>}
     */
    mergeStaticAndElementLayers(originalLayers, elementLayers)
    {
        let layersLoader = new ElementsFromLayersLoader();
        let result = [];
        let inserted = false;
        for(let layer of originalLayers){
            if(!this.isElementLayer(layer, layersLoader)){
                result.push(layer);
                continue;
            }
            if(!inserted){
                result.push(...elementLayers);
                inserted = true;
            }
        }
        if(!inserted){
            result.push(...elementLayers);
        }
        return result;
    }

    /**
     * @param {Object} layer
     * @param {ElementsFromLayersLoader} layersLoader
     * @returns {boolean}
     */
    isElementLayer(layer, layersLoader)
    {
        if('tilelayer' !== layer.type){
            return false;
        }
        if(layersLoader.shouldSkipLayer(layer.name)){
            return false;
        }
        return null !== layersLoader.elementLayerName.parse(layer.name);
    }

}

module.exports.ElementsToLayersBuilder = ElementsToLayersBuilder;
