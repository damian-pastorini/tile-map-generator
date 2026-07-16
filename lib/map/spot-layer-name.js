/**
 *
 * Reldens - Tile Map Generator - SpotLayerName
 *
 * Parses the per-instance spot layer names minted by the SpotGenerator, where the instance number
 * is appended as a "-s{index}" segment and the optional sublayer type follows it:
 * spot "ground-spot-water" + instance 0 => "ground-spot-water-s0", "ground-spot-water-s0-borders".
 *
 * The spot instances are placed as elements, so the ElementLayerWriter runs every sublayer name through
 * ElementLayerName.build, which fuses the element number into the "-s{index}" segment while the base layer
 * name is returned untouched: "ground-spot-water-s0" keeps its name but its variation sublayer is minted
 * as "ground-spot-water-s00-spot-variations". The fused number cannot be told apart from the instance digits
 * by reading a single name, so resolveBaseInstanceId maps a sublayer back onto the base instance ids that
 * are actually present in the map.
 *
 */

const { sc } = require('@reldens/utils');

class SpotLayerName
{

    constructor()
    {
        this.defaultLayerType = 'spot';
        this.fusedNumberPattern = /^\d+$/;
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
     * @param {string} instanceId
     * @param {Array<string>} baseInstanceIds
     * @returns {string}
     */
    resolveBaseInstanceId(instanceId, baseInstanceIds)
    {
        let resolved = instanceId;
        let resolvedLength = 0;
        for(let baseInstanceId of baseInstanceIds){
            if(!this.isFusedInstanceOf(instanceId, baseInstanceId)){
                continue;
            }
            if(baseInstanceId.length <= resolvedLength){
                continue;
            }
            resolved = baseInstanceId;
            resolvedLength = baseInstanceId.length;
        }
        return resolved;
    }

    /**
     * @param {string} instanceId
     * @param {string} baseInstanceId
     * @returns {boolean}
     */
    isFusedInstanceOf(instanceId, baseInstanceId)
    {
        if(instanceId === baseInstanceId){
            return true;
        }
        if(!sc.startsWith(instanceId, baseInstanceId)){
            return false;
        }
        return this.fusedNumberPattern.test(instanceId.slice(baseInstanceId.length));
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
