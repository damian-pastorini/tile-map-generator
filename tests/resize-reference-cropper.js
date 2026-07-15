/**
 *
 * Reldens - Tile Map Generator - ResizeReferenceCropper (test helper)
 *
 * Independent, deliberately naive reference implementation used ONLY by the tests to produce the expected
 * resized map. It is NOT MapResizer and shares none of its resize logic: given a plain sub-rectangle box
 * {minX, minY, newWidth, newHeight}, it slices that rectangle out of every tile layer of the source map and
 * drops any element layer that becomes fully empty (mirroring the resize contract), keeping the always-kept
 * static layers. Because it reaches the result a different way than MapResizer, the two agreeing on a real map
 * proves the resize, and a mis-crop by MapResizer makes them disagree. Layers are built with the shared
 * LayerDataFactory.buildTileLayer so the output carries the same visible/opacity/x/y fields as a real map.
 *
 */

const { LayerDataFactory } = require('../lib/map/layer-data-factory');

class ResizeReferenceCropper
{

    constructor()
    {
        this.layerDataFactory = new LayerDataFactory();
    }

    crop(mapJson, box, keepAlwaysNames)
    {
        let result = {
            type: 'map',
            version: mapJson.version,
            orientation: mapJson.orientation,
            renderorder: mapJson.renderorder,
            width: box.newWidth,
            height: box.newHeight,
            tilewidth: mapJson.tilewidth,
            tileheight: mapJson.tileheight,
            infinite: mapJson.infinite,
            tilesets: mapJson.tilesets,
            layers: []
        };
        for(let layer of mapJson.layers){
            this.appendCroppedLayer(result.layers, layer, mapJson.width, box, keepAlwaysNames);
        }
        return result;
    }

    appendCroppedLayer(target, layer, oldWidth, box, keepAlwaysNames)
    {
        if('tilelayer' !== layer.type){
            return;
        }
        let data = this.subRectangle(layer.data, oldWidth, box);
        if(this.isEmpty(data) && -1 === keepAlwaysNames.indexOf(layer.name)){
            return;
        }
        target.push(this.layerDataFactory.buildTileLayer(layer.name, data, box.newWidth, box.newHeight));
    }

    subRectangle(data, oldWidth, box)
    {
        let out = [];
        for(let row = 0; row < box.newHeight; row++){
            let start = (box.minY + row) * oldWidth + box.minX;
            out.push(...data.slice(start, start + box.newWidth));
        }
        return out;
    }

    isEmpty(data)
    {
        for(let value of data){
            if(0 !== value){
                return false;
            }
        }
        return true;
    }

}

module.exports.ResizeReferenceCropper = ResizeReferenceCropper;
