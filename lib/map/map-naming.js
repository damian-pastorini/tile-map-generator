/**
 *
 * Reldens - Tile Map Generator - MapNaming
 *
 * Builds the map, group and floor names, and validates the names joined into the generated files paths: a name is a
 * file name only when it is its own base name, so it can never point to another folder.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class MapNaming
{

    constructor()
    {
    }

    fuseGroupName(parts)
    {
        return parts[0]+'-'+parts[1];
    }

    buildFloorSuffix(floorKey, floorNumber)
    {
        return '-'+floorKey+'Floor-n'+floorNumber;
    }

    stripJsonExtension(name)
    {
        return name.replace('.json', '');
    }

    ensureJsonExtension(name)
    {
        if(-1 === name.indexOf('.json')){
            name += '.json';
        }
        return name;
    }

    toJsonFileName(mapName)
    {
        return mapName+'.json';
    }

    toPngFileName(mapName)
    {
        return mapName+'.png';
    }

    isFileName(name)
    {
        return sc.isString(name) && '..' !== name && name === FileHandler.getFileName(name);
    }

}

module.exports.MapNaming = MapNaming;
