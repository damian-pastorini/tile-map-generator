/**
 *
 * Reldens - Tile Map Generator - LayerUtility
 *
 */

const { sc } = require('@reldens/utils');

class LayerUtility
{

    static matchesLayerName(layerName, searchString, matchMode)
    {
        if('exact' === matchMode){
            return layerName === searchString;
        }
        if('prefix' === matchMode){
            return 0 === layerName.indexOf(searchString);
        }
        return -1 !== layerName.indexOf(searchString);
    }

    static findLayers(map, searchString, matchMode = 'contains', nameFilter = null)
    {
        let layers = sc.get(map, 'layers', []);
        let matchingLayers = [];
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(!LayerUtility.matchesLayerName(layerName, searchString, matchMode)){
                continue;
            }
            if(nameFilter && !nameFilter(layerName)){
                continue;
            }
            matchingLayers.push(layer);
        }
        return matchingLayers;
    }

    static findLayer(map, searchString, matchMode = 'contains')
    {
        let matchingLayers = LayerUtility.findLayers(map, searchString, matchMode);
        if(0 === matchingLayers.length){
            return null;
        }
        return matchingLayers.shift();
    }

}

module.exports.LayerUtility = LayerUtility;
