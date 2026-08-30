/**
 *
 * Reldens - MapTileKeyFinder
 *
 * Resolves a generated map tile gid from the key annotation the composite carries on that tile. The optimizer
 * repacks the tileset whenever the composite changes, so the gids move while the key annotations do not. Tests
 * that assert on a specific tile look it up by key through this finder instead of hardcoding a packed number.
 *
 */

class MapTileKeyFinder
{

    static fetchKeyPropertyValue(tile)
    {
        for(let property of (tile.properties ? tile.properties : [])){
            if('key' === property.name){
                return property.value;
            }
        }
        return '';
    }

    static fetchTileGidByKey(map, keyValue)
    {
        let tileset = map.tilesets[0];
        for(let tile of (tileset.tiles ? tileset.tiles : [])){
            if(keyValue === MapTileKeyFinder.fetchKeyPropertyValue(tile)){
                return tileset.firstgid + tile.id;
            }
        }
        return 0;
    }

}

module.exports.MapTileKeyFinder = MapTileKeyFinder;
