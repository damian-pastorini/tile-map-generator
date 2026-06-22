/**
 *
 * Reldens - Tile Map Generator - ElementNameSuffix
 *
 * Numeric-suffix utilities for element instance ids of the form "{base}-{NNN}".
 *
 */

class ElementNameSuffix
{

    /**
     * @param {number} n
     * @returns {string}
     */
    static padNum(n)
    {
        return (''+n).padStart(3, '0');
    }

    /**
     * @param {Array<string>} existingNames
     * @param {string} base
     * @returns {number}
     */
    static maxSuffix(existingNames, base)
    {
        let prefix = base+'-';
        let max = 0;
        for(let name of existingNames){
            if(!name.startsWith(prefix)){
                continue;
            }
            let suffixStr = name.slice(prefix.length);
            if(!/^\d+$/.test(suffixStr)){
                continue;
            }
            let suffix = Number(suffixStr);
            if(suffix > max){
                max = suffix;
            }
        }
        return max;
    }

    /**
     * @param {Array<string>} existingNames
     * @param {string} base
     * @returns {string}
     */
    static nextSuffix(existingNames, base)
    {
        return base+'-'+ElementNameSuffix.padNum(ElementNameSuffix.maxSuffix(existingNames, base) + 1);
    }

    /**
     * @param {string} name
     * @returns {number}
     */
    static parseSuffix(name)
    {
        let match = name.match(/-(\d+)$/);
        if(!match){
            return 0;
        }
        return Number(match[1]);
    }

    /**
     * @param {string} instanceId
     * @returns {Object}
     */
    static splitInstanceId(instanceId)
    {
        let match = instanceId.match(/^(.+)-(\d+)$/);
        if(!match){
            return {base: instanceId, index: 0};
        }
        return {base: match[1], index: Number(match[2])};
    }

    /**
     * @param {Array<string>} existingNames
     * @param {string} name
     * @returns {string}
     */
    static resolveUnique(existingNames, name)
    {
        let nameTaken = -1 !== existingNames.indexOf(name);
        if(!nameTaken){
            return name;
        }
        let max = ElementNameSuffix.maxSuffix(existingNames, name);
        if(0 === max){
            max = 1;
        }
        return name+'-'+ElementNameSuffix.padNum(max + 1);
    }
}

module.exports.ElementNameSuffix = ElementNameSuffix;
