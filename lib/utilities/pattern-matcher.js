/**
 *
 * Reldens - Tile Map Generator - PatternMatcher
 *
 */

const { ElementLayerName } = require('./element-layer-name');
const { Logger, sc } = require('@reldens/utils');

class PatternMatcher
{

    constructor()
    {
        this.elementLayerName = new ElementLayerName();
    }

    countElementInstancesInMap(map, config, elementType)
    {
        let layerElements = sc.get(config, 'layerElements', {});
        let elementConfig = sc.get(layerElements, elementType, []);
        if(0 === elementConfig.length){
            return 0;
        }
        let elementLayers = elementConfig.filter(layer => 'tilelayer' === layer.type);
        if(0 === elementLayers.length){
            return 0;
        }
        let mapLayers = sc.get(map, 'layers', []);
        let instanceIndexes = new Set();
        for(let mapLayer of mapLayers){
            let instanceIndex = this.elementLayerName.instanceIndex(elementType, mapLayer.name);
            if(null !== instanceIndex){
                instanceIndexes.add(instanceIndex);
            }
        }
        Logger.debug('Total count for', elementType, ':', instanceIndexes.size);
        return instanceIndexes.size;
    }

}

module.exports.PatternMatcher = PatternMatcher;
