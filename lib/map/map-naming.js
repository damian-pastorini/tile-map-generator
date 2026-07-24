/**
 *
 * Reldens - Tile Map Generator - MapNaming
 *
 */

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

}

module.exports.MapNaming = MapNaming;
