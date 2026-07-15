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
const { SpotLayerName } = require('./spot-layer-name');
const { sc } = require('@reldens/utils');

class ElementsToLayersBuilder
{

    constructor(props)
    {
        this.layerDataFactory = new LayerDataFactory();
        this.elementsLoader = new ElementsFromLayersLoader();
        this.spotLayerName = new SpotLayerName();
        this.autoMergeLayersByKeys = sc.get(props, 'autoMergeLayersByKeys', []);
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
        let elementLayers = this.mergeElementLayers(this.buildElementLayers(mapElements.elements, mapWidth, mapHeight));
        mapJson.layers = this.mergeSpotLayers(this.mergeStaticAndElementLayers(mapJson.layers, elementLayers));
        return mapJson;
    }

    /**
     * @param {Array<Object>} elementLayers
     * @returns {Array<Object>}
     */
    mergeElementLayers(elementLayers)
    {
        if(0 === this.autoMergeLayersByKeys.length){
            return elementLayers;
        }
        let mergedLayers = [];
        for(let layer of elementLayers){
            this.placeLayer(mergedLayers, layer);
        }
        return this.nameMergedLayers(mergedLayers);
    }

    /**
     * @param {Array<Object>} mergedLayers
     * @param {Object} layer
     */
    placeLayer(mergedLayers, layer)
    {
        let layerType = this.elementLayerTypeOf(layer);
        let cells = this.layerDataFactory.nonZeroCells(layer.data);
        if(-1 === this.autoMergeLayersByKeys.indexOf(layerType)){
            mergedLayers.push({type: layerType, cells: new Set(cells), data: layer.data, merged: false, template: layer});
            return;
        }
        let target = this.findMergeTarget(mergedLayers, layerType, cells);
        if(-1 === target){
            mergedLayers.push({type: layerType, cells: new Set(cells), data: [...layer.data], merged: true, template: layer});
            return;
        }
        this.absorbLayer(mergedLayers[target], layer.data, cells);
    }

    /**
     * @param {Array<Object>} mergedLayers
     * @param {string} layerType
     * @param {Array<number>} cells
     * @returns {number}
     */
    findMergeTarget(mergedLayers, layerType, cells)
    {
        let floor = this.highestOverlap(mergedLayers, cells);
        for(let i = floor + 1; i < mergedLayers.length; i++){
            if(this.canMergeInto(mergedLayers[i], layerType, cells)){
                return i;
            }
        }
        return -1;
    }

    /**
     * @param {Array<Object>} mergedLayers
     * @param {Array<number>} cells
     * @returns {number}
     */
    highestOverlap(mergedLayers, cells)
    {
        for(let i = mergedLayers.length - 1; 0 <= i; i--){
            if(this.layerDataFactory.cellsHitBucket(mergedLayers[i].cells, cells)){
                return i;
            }
        }
        return -1;
    }

    /**
     * @param {Object} mergedLayer
     * @param {string} layerType
     * @param {Array<number>} cells
     * @returns {boolean}
     */
    canMergeInto(mergedLayer, layerType, cells)
    {
        if(!mergedLayer.merged){
            return false;
        }
        if(mergedLayer.type !== layerType){
            return false;
        }
        return !this.layerDataFactory.cellsHitBucket(mergedLayer.cells, cells);
    }

    /**
     * @param {Object} mergedLayer
     * @param {Array<number>} data
     * @param {Array<number>} cells
     */
    absorbLayer(mergedLayer, data, cells)
    {
        mergedLayer.data = this.layerDataFactory.mergeTileArrays(mergedLayer.data, data);
        for(let cell of cells){
            mergedLayer.cells.add(cell);
        }
    }

    /**
     * @param {Object} layer
     * @returns {string}
     */
    elementLayerTypeOf(layer)
    {
        let parsed = this.elementsLoader.elementLayerName.parse(layer.name);
        if(!parsed){
            return '';
        }
        return parsed.layerType;
    }

    /**
     * @param {Array<Object>} mergedLayers
     * @returns {Array<Object>}
     */
    nameMergedLayers(mergedLayers)
    {
        let counts = {};
        let result = [];
        for(let mergedLayer of mergedLayers){
            result.push(this.toNamedLayer(mergedLayer, counts));
        }
        return result;
    }

    /**
     * @param {Object} mergedLayer
     * @param {Object} counts
     * @returns {Object}
     */
    toNamedLayer(mergedLayer, counts)
    {
        if(!mergedLayer.merged){
            return mergedLayer.template;
        }
        counts[mergedLayer.type] = sc.get(counts, mergedLayer.type, 0) + 1;
        return {
            ...mergedLayer.template,
            name: this.layerDataFactory.mergedGroupLayerName(mergedLayer.type, counts[mergedLayer.type]),
            data: mergedLayer.data
        };
    }

    /**
     * @param {Array<Object>} layers
     * @returns {Array<Object>}
     */
    mergeSpotLayers(layers)
    {
        if(-1 === this.autoMergeLayersByKeys.indexOf('spot')){
            return layers;
        }
        return this.layerDataFactory.mergeLayersByGroupKey(layers, layer => this.spotMergeKey(layer));
    }

    /**
     * @param {Object} layer
     * @returns {string|null}
     */
    spotMergeKey(layer)
    {
        if(!this.elementsLoader.isSpotLayer(layer)){
            return null;
        }
        return this.spotLayerName.groupKey(layer.name);
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
        return this.layerDataFactory.buildTileLayer(
            elementLayer.name,
            this.layerDataFactory.buildDataFromTiles(elementLayer.tiles, mapWidth, mapHeight),
            mapWidth,
            mapHeight
        );
    }

    /**
     * @param {Array<Object>} originalLayers
     * @param {Array<Object>} elementLayers
     * @returns {Array<Object>}
     */
    mergeStaticAndElementLayers(originalLayers, elementLayers)
    {
        let result = [];
        let inserted = false;
        for(let layer of originalLayers){
            if(!this.isElementLayer(layer)){
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
     * @returns {boolean}
     */
    isElementLayer(layer)
    {
        if('tilelayer' !== layer.type){
            return false;
        }
        if(this.elementsLoader.shouldSkipLayer(layer.name)){
            return false;
        }
        return null !== this.elementsLoader.elementLayerName.parse(layer.name);
    }

}

module.exports.ElementsToLayersBuilder = ElementsToLayersBuilder;
