/**
 *
 * Reldens - Tile Map Generator - LayerDataFactory
 *
 */

class LayerDataFactory
{

    createEmptyLayerData(width, height)
    {
        return new Array(width * height).fill(0);
    }

    tileIndex(row, column, width)
    {
        return row * width + column;
    }

    rowAndColumnByTileIndex(index, width)
    {
        return {row: Math.floor(index / width), column: index % width};
    }

    writeTilesToData(data, tiles, mapWidth, valueProvider)
    {
        for(let tile of tiles){
            data[tile.row * mapWidth + tile.col] = valueProvider(tile);
        }
        return data;
    }

    mergeTileArrays(base, overlay)
    {
        return base.map((tile, index) => 0 !== tile ? tile : overlay[index]);
    }

    mergeLayersByNameSubstring(layers, matchKey)
    {
        let used = new Set();
        let result = [];
        for(let i = 0; i < layers.length; i++){
            if(used.has(i)){
                continue;
            }
            let current = layers[i];
            if(!current.name.includes(matchKey)){
                result.push(current);
                continue;
            }
            result.push(this.absorbMatchingLayers(layers, i, used, matchKey));
        }
        return result;
    }

    absorbMatchingLayers(layers, startIndex, used, matchKey)
    {
        let current = layers[startIndex];
        let data = [...current.data];
        let name = current.name;
        for(let candidateIndex = startIndex + 1; candidateIndex < layers.length; candidateIndex++){
            if(used.has(candidateIndex)){
                continue;
            }
            let candidate = layers[candidateIndex];
            if(!candidate.name.includes(matchKey)){
                continue;
            }
            if(this.hasTileCollision(data, candidate.data)){
                continue;
            }
            data = this.mergeTileArrays(data, candidate.data);
            name += "-" + candidate.name;
            used.add(candidateIndex);
        }
        return {...current, name: "merge-" + name, data};
    }

    hasTileCollision(data, candidateData)
    {
        let collision = false;
        for(let i = 0; i < data.length; i++){
            if(data[i] !== 0 && candidateData[i] !== 0){
                collision = true;
                break;
            }
        }
        return collision;
    }

    buildTileLayer(name, data, width, height)
    {
        return {
            name,
            type: 'tilelayer',
            width,
            height,
            visible: true,
            opacity: 1,
            x: 0,
            y: 0,
            data
        };
    }

    padLayerData(data, width, height, extraTiles)
    {
        let newWidth = width + extraTiles * 2;
        let newHeight = height + extraTiles * 2;
        let newData = new Array(newWidth * newHeight).fill(0);
        for(let row = 0; row < height; row++){
            this.padLayerRow(data, width, row, newData, newWidth, extraTiles);
        }
        return {width: newWidth, height: newHeight, data: newData};
    }

    padLayerRow(data, width, row, newData, newWidth, extraTiles)
    {
        for(let column = 0; column < width; column++){
            newData[(row + extraTiles) * newWidth + (column + extraTiles)] = data[row * width + column];
        }
    }

    forEachMapCell(width, height, callback)
    {
        for(let row = 0; row < height; row++){
            this.forEachCellInRow(width, row, callback);
        }
    }

    forEachCellInRow(width, row, callback)
    {
        for(let column = 0; column < width; column++){
            callback(column, row, row * width + column);
        }
    }

}

module.exports.LayerDataFactory = LayerDataFactory;
