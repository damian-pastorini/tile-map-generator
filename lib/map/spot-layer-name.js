/**
 *
 * Reldens - Tile Map Generator - SpotLayerName
 *
 * Parses the per-instance spot layer names minted by the SpotGenerator, where the instance number
 * is appended as a "-s{index}" segment and the optional sub-layer type follows it:
 * spot "ground-spot-water" + instance 0 => "ground-spot-water-s0", "ground-spot-water-s0-borders".
 *
 */

const { sc } = require('@reldens/utils');

class SpotLayerName
{

    constructor()
    {
        this.defaultLayerType = 'spot';
    }

    /**
     * @param {string} layerName
     * @returns {Object|null}
     */
    parse(layerName)
    {
        if(!sc.isString(layerName)){
            return null;
        }
        let match = layerName.match(/^(.*)-s(\d+)(?:-(.*))?$/);
        if(!match){
            return null;
        }
        if(0 === match[1].length){
            return null;
        }
        return {
            instanceId: match[1]+'-s'+match[2],
            base: match[1],
            index: Number(match[2]),
            layerType: match[3] ? match[3] : this.defaultLayerType
        };
    }

    /**
     * @param {string} layerName
     * @returns {string|null}
     */
    groupKey(layerName)
    {
        let match = layerName.match(/^(.*)-s\d+(.*)$/);
        if(!match){
            return null;
        }
        return match[1]+match[2];
    }

}

module.exports.SpotLayerName = SpotLayerName;
