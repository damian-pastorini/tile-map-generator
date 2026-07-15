/**
 *
 * Reldens - Tile Map Generator - SpotsToLayersBuilder
 *
 * Inverse of SpotsFromLayersLoader: rebuilds the data of the spot layers of a Tiled mapJson from a
 * spot record. Layers are matched by name and only their data is replaced, so the layer identity,
 * names and order are never modified. Spots missing from the record are left untouched, which makes
 * a partial record valid and the whole operation idempotent.
 *
 */

const { LayerDataFactory } = require('./layer-data-factory');
const { Logger, sc } = require('@reldens/utils');

class SpotsToLayersBuilder
{

    constructor()
    {
        this.layerDataFactory = new LayerDataFactory();
    }

    /**
     * @param {Object} mapJson
     * @param {Object} mapSpots
     * @returns {Object}
     */
    apply(mapJson, mapSpots)
    {
        if(!mapJson){
            return mapJson;
        }
        if(!mapSpots){
            return mapJson;
        }
        if(!sc.isArray(mapSpots.spots)){
            return mapJson;
        }
        let mapWidth = Number(sc.get(mapJson, 'width', 0));
        let mapHeight = Number(sc.get(mapJson, 'height', 0));
        for(let spot of mapSpots.spots){
            this.applySpotLayers(mapJson.layers, spot, mapWidth, mapHeight);
        }
        return mapJson;
    }

    /**
     * @param {Array<Object>} mapLayers
     * @param {Object} spot
     * @param {number} mapWidth
     * @param {number} mapHeight
     */
    applySpotLayers(mapLayers, spot, mapWidth, mapHeight)
    {
        if(!sc.isArray(spot.layers)){
            return;
        }
        for(let spotLayer of spot.layers){
            this.replaceLayerData(mapLayers, spotLayer, mapWidth, mapHeight);
        }
    }

    /**
     * @param {Array<Object>} mapLayers
     * @param {Object} spotLayer
     * @param {number} mapWidth
     * @param {number} mapHeight
     */
    replaceLayerData(mapLayers, spotLayer, mapWidth, mapHeight)
    {
        let mapLayer = sc.fetchByProperty(mapLayers, 'name', spotLayer.name);
        if(!mapLayer){
            Logger.warning('SpotsToLayersBuilder skipped a missing spot layer: '+spotLayer.name);
            return;
        }
        mapLayer.data = this.layerDataFactory.buildDataFromTiles(spotLayer.tiles, mapWidth, mapHeight);
    }

}

module.exports.SpotsToLayersBuilder = SpotsToLayersBuilder;
