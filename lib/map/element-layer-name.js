/**
 *
 * Reldens - Tile Map Generator - ElementLayerName
 *
 * Builds and parses per-instance element layer names. The instance number is fused to the
 * element key (no extra "-" segment) so the dash-delimited structure stays intact:
 * element "tree" + layer "tree-collisions" + instance 0 => "tree0-collisions".
 *
 */

class ElementLayerName
{

    constructor()
    {
        this.elementLayerTypes = [
            'collisions-over-player',
            'collisions',
            'over-player',
            'below-player',
            'path',
            'base'
        ];
    }

    build(elementType, elementNumber, layerName)
    {
        if(!elementType){
            return layerName + elementNumber;
        }
        if(layerName === elementType){
            return layerName;
        }
        if('path' === layerName){
            return layerName;
        }
        if(layerName.startsWith(elementType + '-')){
            return elementType + elementNumber + '-' + layerName.slice(elementType.length + 1);
        }
        return elementType + elementNumber + '-' + layerName;
    }

    instanceIndex(elementType, layerName)
    {
        if(!layerName.startsWith(elementType)){
            return null;
        }
        let match = layerName.slice(elementType.length).match(/^([0-9]+)-/);
        if(!match){
            return null;
        }
        return match[1];
    }

    parse(layerName)
    {
        if(!layerName){
            return null;
        }
        let byStandaloneIndex = this.parseStandaloneIndex(layerName);
        if(byStandaloneIndex){
            return byStandaloneIndex;
        }
        return this.parseFusedOrPlain(layerName);
    }

    parseStandaloneIndex(layerName)
    {
        let parts = layerName.split('-');
        if(3 > parts.length){
            return null;
        }
        let indexAt = -1;
        for(let i = 0; i < parts.length; i++){
            if(/^[0-9]+$/.test(parts[i])){
                indexAt = i;
                break;
            }
        }
        if(-1 === indexAt){
            return null;
        }
        if(parts.length - 1 === indexAt){
            return null;
        }
        return {
            instanceId: parts.slice(0, indexAt + 1).join('-'),
            base: parts.slice(0, indexAt).join('-'),
            index: Number(parts[indexAt]),
            layerType: parts.slice(indexAt + 1).join('-')
        };
    }

    parseFusedOrPlain(layerName)
    {
        let layerType = this.matchLayerType(layerName);
        if(!layerType){
            return null;
        }
        let prefix = layerName.slice(0, layerName.length - layerType.length - 1);
        if(0 === prefix.length){
            return null;
        }
        let digitsMatch = prefix.match(/([0-9]+)$/);
        if(!digitsMatch){
            return {instanceId: prefix, base: prefix, index: 0, layerType};
        }
        return {
            instanceId: prefix,
            base: prefix.slice(0, prefix.length - digitsMatch[1].length),
            index: Number(digitsMatch[1]),
            layerType
        };
    }

    matchLayerType(layerName)
    {
        for(let layerType of this.elementLayerTypes){
            if(layerName.endsWith('-'+layerType)){
                return layerType;
            }
        }
        return null;
    }

}

module.exports.ElementLayerName = ElementLayerName;
