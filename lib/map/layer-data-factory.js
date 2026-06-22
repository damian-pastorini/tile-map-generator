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
