/**
 *
 * Reldens - Tile Map Generator - ElementMover
 *
 * Translates every tile of every layer that belongs to a single element by the same
 * (deltaCol, deltaRow). Mutates the in-memory Tiled mapJson layers' data arrays and the
 * matching elements record entry. Out-of-bounds writes abort the move.
 *
 */

const { sc } = require('@reldens/utils');
const { LayerDataFactory } = require('./layer-data-factory');

class ElementMover
{

    constructor()
    {
        this.layerDataFactory = new LayerDataFactory();
    }

    /**
     * @param {Object} mapJson
     * @param {Object} mapElements
     * @param {string} instanceId
     * @param {number} deltaCol
     * @param {number} deltaRow
     * @returns {Object}
     */
    move(mapJson, mapElements, instanceId, deltaCol, deltaRow)
    {
        let element = sc.fetchByProperty(mapElements.elements, 'instanceId', instanceId);
        if(!element){
            return {success: false, error: 'elementNotFound'};
        }
        let mapWidth = Number(sc.get(mapJson, 'width', 0));
        let mapHeight = Number(sc.get(mapJson, 'height', 0));
        if(this.anyTileOutOfBounds(element, deltaCol, deltaRow, mapWidth, mapHeight)){
            return {success: false, error: 'outOfBounds'};
        }
        for(let elementLayer of element.layers){
            this.translateLayer(mapJson.layers, elementLayer, deltaCol, deltaRow, mapWidth);
        }
        element.bounds.col += deltaCol;
        element.bounds.row += deltaRow;
        return {success: true};
    }

    /**
     * @param {Object} element
     * @param {number} deltaCol
     * @param {number} deltaRow
     * @param {number} mapWidth
     * @param {number} mapHeight
     * @returns {boolean}
     */
    anyTileOutOfBounds(element, deltaCol, deltaRow, mapWidth, mapHeight)
    {
        for(let elementLayer of element.layers){
            if(this.layerHasOutOfBoundsTile(elementLayer, deltaCol, deltaRow, mapWidth, mapHeight)){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Object} elementLayer
     * @param {number} deltaCol
     * @param {number} deltaRow
     * @param {number} mapWidth
     * @param {number} mapHeight
     * @returns {boolean}
     */
    layerHasOutOfBoundsTile(elementLayer, deltaCol, deltaRow, mapWidth, mapHeight)
    {
        for(let tile of elementLayer.tiles){
            let newCol = tile.col + deltaCol;
            if(0 > newCol){
                return true;
            }
            if(newCol >= mapWidth){
                return true;
            }
            let newRow = tile.row + deltaRow;
            if(0 > newRow){
                return true;
            }
            if(newRow >= mapHeight){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Array<Object>} mapLayers
     * @param {Object} elementLayer
     * @param {number} deltaCol
     * @param {number} deltaRow
     * @param {number} mapWidth
     */
    translateLayer(mapLayers, elementLayer, deltaCol, deltaRow, mapWidth)
    {
        let mapLayer = sc.fetchByProperty(mapLayers, 'name', elementLayer.name);
        if(!mapLayer){
            return;
        }
        let newData = new Array(mapLayer.data.length).fill(0);
        for(let tile of elementLayer.tiles){
            tile.col += deltaCol;
            tile.row += deltaRow;
        }
        this.layerDataFactory.writeTilesToData(newData, elementLayer.tiles, mapWidth, tile => tile.gid);
        mapLayer.data = newData;
    }
}

module.exports.ElementMover = ElementMover;
