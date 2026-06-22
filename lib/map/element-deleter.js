/**
 *
 * Reldens - Tile Map Generator - ElementDeleter
 *
 * Removes every tile of every layer that belongs to a single element from the Tiled mapJson
 * and removes the element entry from the element record.
 *
 */

const { sc } = require('@reldens/utils');
const { LayerDataFactory } = require('./layer-data-factory');

class ElementDeleter
{

    constructor()
    {
        this.layerDataFactory = new LayerDataFactory();
    }

    /**
     * @param {Object} mapJson
     * @param {Object} mapElements
     * @param {string} instanceId
     * @returns {Object}
     */
    delete(mapJson, mapElements, instanceId)
    {
        let element = sc.fetchByProperty(mapElements.elements, 'instanceId', instanceId);
        if(!element){
            return {success: false, error: 'elementNotFound'};
        }
        let mapWidth = Number(sc.get(mapJson, 'width', 0));
        for(let elementLayer of element.layers){
            let mapLayer = sc.fetchByProperty(mapJson.layers, 'name', elementLayer.name);
            if(!mapLayer){
                continue;
            }
            this.layerDataFactory.writeTilesToData(mapLayer.data, elementLayer.tiles, mapWidth, () => 0);
        }
        mapElements.elements.splice(mapElements.elements.indexOf(element), 1);
        return {success: true};
    }
}

module.exports.ElementDeleter = ElementDeleter;
