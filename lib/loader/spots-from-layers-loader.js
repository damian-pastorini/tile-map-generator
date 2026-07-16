/**
 *
 * Reldens - Tile Map Generator - SpotsFromLayersLoader
 *
 * Sibling of ElementsFromLayersLoader for the generated spot layers: groups every "-s{index}" layer
 * by instance id and returns the same record entry shape used for the elements, so the spots can be
 * moved through the very same pipeline. Grouping, tile extraction and bounds are delegated to the
 * element loader; the only difference is which layers are collected.
 *
 */

const { ElementsFromLayersLoader } = require('./elements-from-layers-loader');
const { SpotLayerName } = require('../map/spot-layer-name');
const { Logger, sc } = require('@reldens/utils');

class SpotsFromLayersLoader
{

    constructor()
    {
        this.elementsLoader = new ElementsFromLayersLoader();
        this.spotLayerName = new SpotLayerName();
    }

    /**
     * @param {Object} mapJson
     * @returns {Object}
     */
    load(mapJson)
    {
        if(!sc.isObject(mapJson)){
            Logger.error('SpotsFromLayersLoader.load called without mapJson.');
            return {spots: [], warnings: ['no-map-json']};
        }
        let warnings = [];
        let layers = sc.isArray(mapJson.layers) ? mapJson.layers : [];
        if(0 === layers.length){
            warnings.push('no-layers');
            return {spots: [], warnings};
        }
        let mapWidth = Number(sc.get(mapJson, 'width', 0));
        let groups = {};
        this.appendSubLayers(groups, this.appendBaseLayers(groups, layers, mapWidth), mapWidth);
        let spots = this.buildSpots(groups);
        if(0 === spots.length){
            warnings.push('no-spots-detected');
        }
        return {spots, warnings};
    }

    /**
     * @param {Object} groups
     * @param {Array<Object>} layers
     * @param {number} mapWidth
     * @returns {Array<Object>}
     */
    appendBaseLayers(groups, layers, mapWidth)
    {
        let subLayers = [];
        for(let layer of layers){
            let parsed = this.parseSpotLayer(layer);
            if(!parsed){
                continue;
            }
            if(this.spotLayerName.defaultLayerType !== parsed.layerType){
                subLayers.push({layer, parsed});
                continue;
            }
            this.elementsLoader.appendToGroup(groups, parsed, layer, mapWidth);
        }
        return subLayers;
    }

    /**
     * @param {Object} groups
     * @param {Array<Object>} subLayers
     * @param {number} mapWidth
     */
    appendSubLayers(groups, subLayers, mapWidth)
    {
        let baseInstanceIds = Object.keys(groups);
        for(let subLayer of subLayers){
            subLayer.parsed.instanceId = this.spotLayerName.resolveBaseInstanceId(
                subLayer.parsed.instanceId,
                baseInstanceIds
            );
            this.elementsLoader.appendToGroup(groups, subLayer.parsed, subLayer.layer, mapWidth);
        }
    }

    /**
     * @param {Object} groups
     * @returns {Array<Object>}
     */
    buildSpots(groups)
    {
        let spots = [];
        for(let instanceId of Object.keys(groups)){
            let spot = groups[instanceId];
            spot.bounds = this.elementsLoader.computeBounds(spot.layers);
            spots.push(spot);
        }
        return spots;
    }

    /**
     * @param {Object} layer
     * @returns {Object|null}
     */
    parseSpotLayer(layer)
    {
        if(!this.elementsLoader.isSpotLayer(layer)){
            return null;
        }
        return this.spotLayerName.parse(layer.name);
    }

}

module.exports.SpotsFromLayersLoader = SpotsFromLayersLoader;
