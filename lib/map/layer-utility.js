/**
 *
 * Reldens - Tile Map Generator - LayerUtility
 *
 */

const { sc } = require('@reldens/utils');

class LayerUtility
{

    static findLayerByName(map, layerName)
    {
        let layers = sc.get(map, 'layers', []);
        for(let layer of layers){
            if(sc.get(layer, 'name') === layerName){
                return layer;
            }
        }
        return null;
    }

    static findLayerByNamePrefix(map, namePrefix)
    {
        let layers = sc.get(map, 'layers', []);
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(0 === layerName.indexOf(namePrefix)){
                return layer;
            }
        }
        return null;
    }

    static findLayersByNamePrefix(map, namePrefix)
    {
        let layers = sc.get(map, 'layers', []);
        let matchingLayers = [];
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(0 === layerName.indexOf(namePrefix)){
                matchingLayers.push(layer);
            }
        }
        return matchingLayers;
    }

    static findLayersByNameContains(map, searchString)
    {
        let layers = sc.get(map, 'layers', []);
        let matchingLayers = [];
        for(let layer of layers){
            let layerName = sc.get(layer, 'name', '');
            if(-1 !== layerName.indexOf(searchString)){
                matchingLayers.push(layer);
            }
        }
        return matchingLayers;
    }

}

module.exports.LayerUtility = LayerUtility;
