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
        if(!matchKey){
            return layers;
        }
        return this.mergeLayersByGroupKey(layers, layer => this.nameSubstringGroup(layer, matchKey));
    }

    nameSubstringGroup(layer, matchKey)
    {
        if(layer.name.includes(matchKey)){
            return matchKey;
        }
        return null;
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

    mergeLayersByGroupKey(layers, groupKeyOf)
    {
        let used = new Set();
        let result = [];
        for(let i = 0; i < layers.length; i++){
            if(used.has(i)){
                continue;
            }
            let groupKey = groupKeyOf(layers[i]);
            if(!groupKey){
                result.push(layers[i]);
                continue;
            }
            this.appendOrderedBuckets(
                result,
                this.collectGroupMembers(layers, i, used, groupKey, groupKeyOf),
                groupKey
            );
        }
        return result;
    }

    appendOrderedBuckets(result, members, groupKey)
    {
        for(let bucketLayer of this.buildOrderedBuckets(members, groupKey)){
            result.push(bucketLayer);
        }
    }

    collectGroupMembers(layers, startIndex, used, groupKey, groupKeyOf)
    {
        let members = [];
        for(let i = startIndex; i < layers.length; i++){
            if(used.has(i)){
                continue;
            }
            if(groupKey !== groupKeyOf(layers[i])){
                continue;
            }
            used.add(i);
            members.push(layers[i]);
        }
        return members;
    }

    buildOrderedBuckets(members, groupKey)
    {
        let bucketsData = [];
        let bucketsCells = [];
        for(let member of members){
            let memberCells = this.nonZeroCells(member.data);
            let targetBucket = this.bucketAboveCollisions(bucketsCells, memberCells);
            this.placeInBucket(bucketsData, bucketsCells, targetBucket, member.data, memberCells);
        }
        return this.bucketsToLayers(bucketsData, members[0], groupKey);
    }

    bucketAboveCollisions(bucketsCells, memberCells)
    {
        for(let bucketIndex = bucketsCells.length - 1; 0 <= bucketIndex; bucketIndex--){
            if(this.cellsHitBucket(bucketsCells[bucketIndex], memberCells)){
                return bucketIndex + 1;
            }
        }
        return 0;
    }

    placeInBucket(bucketsData, bucketsCells, targetBucket, data, memberCells)
    {
        if(!bucketsData[targetBucket]){
            bucketsData[targetBucket] = [...data];
            bucketsCells[targetBucket] = new Set(memberCells);
            return;
        }
        bucketsData[targetBucket] = this.mergeTileArrays(bucketsData[targetBucket], data);
        for(let cell of memberCells){
            bucketsCells[targetBucket].add(cell);
        }
    }

    bucketsToLayers(bucketsData, template, groupKey)
    {
        let result = [];
        for(let bucketIndex = 0; bucketIndex < bucketsData.length; bucketIndex++){
            let name = this.mergedGroupLayerName(groupKey, bucketIndex + 1);
            result.push({...template, name, data: bucketsData[bucketIndex]});
        }
        return result;
    }

    nonZeroCells(data)
    {
        let cells = [];
        for(let i = 0; i < data.length; i++){
            if(0 !== data[i]){
                cells.push(i);
            }
        }
        return cells;
    }

    cellsHitBucket(bucketCells, memberCells)
    {
        for(let cell of memberCells){
            if(bucketCells.has(cell)){
                return true;
            }
        }
        return false;
    }

    mergedGroupLayerName(groupKey, count)
    {
        if(1 === count){
            return 'merge-'+groupKey;
        }
        return 'merge-'+groupKey+'-'+count;
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

    cropLayerData(data, oldWidth, box)
    {
        let newData = new Array(box.width * box.height).fill(0);
        for(let row = 0; row < box.height; row++){
            this.cropLayerRow(data, oldWidth, row, newData, box);
        }
        return newData;
    }

    cropLayerRow(data, oldWidth, row, newData, box)
    {
        for(let column = 0; column < box.width; column++){
            newData[row * box.width + column] = data[(row + box.minY) * oldWidth + (box.minX + column)];
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
