/**
 *
 * Reldens - Tile Map Generator - ElementDeleter
 *
 * Removes every tile of every layer that belongs to a single element from the Tiled mapJson
 * and removes the element entry from the element record.
 *
 */

const { sc } = require('@reldens/utils');

class ElementDeleter
{

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
            this.clearLayerTiles(mapJson.layers, elementLayer, mapWidth);
        }
        mapElements.elements.splice(mapElements.elements.indexOf(element), 1);
        return {success: true};
    }

    /**
     * @param {Array<Object>} mapLayers
     * @param {Object} elementLayer
     * @param {number} mapWidth
     */
    clearLayerTiles(mapLayers, elementLayer, mapWidth)
    {
        let mapLayer = sc.fetchByProperty(mapLayers, 'name', elementLayer.name);
        if(!mapLayer){
            return;
        }
        for(let tile of elementLayer.tiles){
            mapLayer.data[tile.row * mapWidth + tile.col] = 0;
        }
    }
}

module.exports.ElementDeleter = ElementDeleter;
