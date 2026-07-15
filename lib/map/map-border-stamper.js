/**
 *
 * Reldens - Tile Map Generator - MapBorderStamper
 *
 * Rebuilds a map border layer after a resize/crop: reads the border tile global tile ids from the first
 * tileset's "key" properties (border-top, border-left, corners, etc.) and stamps them along the new map edges
 * and corners.
 *
 */

class MapBorderStamper
{

    constructor()
    {
        this.borderKinds = ['top', 'bottom', 'left', 'right', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    }

    restamp(mapJson, bordersLayerName, newWidth, newHeight)
    {
        let bordersLayer = this.findBordersLayer(mapJson, bordersLayerName);
        if(!bordersLayer){
            return false;
        }
        let borderGlobalTileIds = this.collectBorderGlobalTileIds(mapJson);
        if(!borderGlobalTileIds){
            return false;
        }
        bordersLayer.data = this.buildBordersData(newWidth, newHeight, borderGlobalTileIds);
        return true;
    }

    findBordersLayer(mapJson, bordersLayerName)
    {
        let name = bordersLayerName ? bordersLayerName : 'borders';
        for(let mapLayer of mapJson.layers){
            if('tilelayer' === mapLayer.type && mapLayer.name === name){
                return mapLayer;
            }
        }
        return false;
    }

    collectBorderGlobalTileIds(mapJson)
    {
        let tilesets = mapJson.tilesets;
        if(!tilesets || 0 === tilesets.length){
            return false;
        }
        let borderGlobalTileIds = {};
        let tiles = tilesets[0].tiles ? tilesets[0].tiles : [];
        for(let tileDef of tiles){
            this.collectFromTile(borderGlobalTileIds, tileDef);
        }
        if(0 === Object.keys(borderGlobalTileIds).length){
            return false;
        }
        return borderGlobalTileIds;
    }

    collectFromTile(borderGlobalTileIds, tileDef)
    {
        let properties = tileDef.properties ? tileDef.properties : [];
        for(let prop of properties){
            if('key' === prop.name){
                this.assignBorderGlobalTileId(borderGlobalTileIds, prop.value, tileDef.id + 1);
            }
        }
    }

    assignBorderGlobalTileId(borderGlobalTileIds, value, globalTileId)
    {
        let kind = this.borderKindFor(value);
        if(kind){
            borderGlobalTileIds[kind] = globalTileId;
        }
    }

    borderKindFor(value)
    {
        for(let kind of this.borderKinds){
            if('border-' + kind.replace(/([A-Z])/g, '-$1').toLowerCase() === value){
                return kind;
            }
        }
        return false;
    }

    buildBordersData(newWidth, newHeight, borderGlobalTileIds)
    {
        let data = new Array(newWidth * newHeight).fill(0);
        this.stampHorizontalEdges(data, newWidth, newHeight, borderGlobalTileIds);
        this.stampVerticalEdges(data, newWidth, newHeight, borderGlobalTileIds);
        this.stampCorners(data, newWidth, newHeight, borderGlobalTileIds);
        return data;
    }

    stampHorizontalEdges(data, newWidth, newHeight, borderGlobalTileIds)
    {
        let topId = borderGlobalTileIds.top ? borderGlobalTileIds.top : 0;
        let bottomId = borderGlobalTileIds.bottom ? borderGlobalTileIds.bottom : 0;
        for(let column = 1; column < newWidth - 1; column++){
            data[column] = topId;
            data[(newHeight - 1) * newWidth + column] = bottomId;
        }
    }

    stampVerticalEdges(data, newWidth, newHeight, borderGlobalTileIds)
    {
        let leftId = borderGlobalTileIds.left ? borderGlobalTileIds.left : 0;
        let rightId = borderGlobalTileIds.right ? borderGlobalTileIds.right : 0;
        for(let row = 1; row < newHeight - 1; row++){
            data[row * newWidth] = leftId;
            data[row * newWidth + (newWidth - 1)] = rightId;
        }
    }

    stampCorners(data, newWidth, newHeight, borderGlobalTileIds)
    {
        data[0] = borderGlobalTileIds.topLeft ? borderGlobalTileIds.topLeft : 0;
        data[newWidth - 1] = borderGlobalTileIds.topRight ? borderGlobalTileIds.topRight : 0;
        data[(newHeight - 1) * newWidth] = borderGlobalTileIds.bottomLeft ? borderGlobalTileIds.bottomLeft : 0;
        data[(newHeight - 1) * newWidth + (newWidth - 1)] = borderGlobalTileIds.bottomRight
            ? borderGlobalTileIds.bottomRight
            : 0;
    }

}

module.exports.MapBorderStamper = MapBorderStamper;
