/**
 *
 * Reldens - SpotBorderAnalyzer
 *
 */

const { sc } = require('@reldens/utils');

class SpotBorderAnalyzer
{

    constructor(layerDataFactory)
    {
        this.layerDataFactory = layerDataFactory;
    }

    findBorderTiles(layer, groundSpotConfig, tileValue)
    {
        let width = groundSpotConfig.width;
        let height = groundSpotConfig.height;
        let borderTiles = [];
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let index = this.layerDataFactory.tileIndex(y, x, width);
                if(groundSpotConfig.applyCornersTiles){
                    if(tileValue !== layer[index] && 0 !== layer[index]){
                        borderTiles.push(index);
                    }
                    continue;
                }
                if(tileValue !== layer[index]){
                    continue;
                }
                let hasEmptyNeighbor = false;
                if(0 < y && 0 === layer[(y-1) * width + x]){
                    hasEmptyNeighbor = true;
                }
                if(height - 1 > y && 0 === layer[(y+1) * width + x]){
                    hasEmptyNeighbor = true;
                }
                if(0 < x && 0 === layer[y * width + (x-1)]){
                    hasEmptyNeighbor = true;
                }
                if(width - 1 > x && 0 === layer[y * width + (x+1)]){
                    hasEmptyNeighbor = true;
                }
                if(hasEmptyNeighbor){
                    borderTiles.push(index);
                }
            }
        }
        return borderTiles;
    }

    findContinuousBorderSequences(borderTiles, width, height, pathSize)
    {
        let rowGroups = [];
        for(let i = 0; i < height; i++){
            rowGroups.push([]);
        }
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            let {row, column} = this.layerDataFactory.rowAndColumnByTileIndex(index, width);
            rowGroups[row].push(column);
        }
        let horizontalSequences = this.scanContinuousSequences(
            rowGroups,
            pathSize,
            (primary, secondaryValue) => primary * width + secondaryValue
        );
        let colGroups = [];
        for(let i = 0; i < width; i++){
            colGroups.push([]);
        }
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            let {row, column} = this.layerDataFactory.rowAndColumnByTileIndex(index, width);
            colGroups[column].push(row);
        }
        let verticalSequences = this.scanContinuousSequences(
            colGroups,
            pathSize,
            (primary, secondaryValue) => secondaryValue * width + primary
        );
        return [...horizontalSequences, ...verticalSequences];
    }

    scanContinuousSequences(groups, pathSize, indexBuilder)
    {
        let sequences = [];
        for(let primary = 0; primary < groups.length; primary++){
            if(0 === groups[primary].length){
                continue;
            }
            let values = groups[primary].sort((a, b) => a - b);
            for(let i = 0; i < values.length - pathSize + 1; i++){
                let continuous = true;
                for(let j = 1; j < pathSize; j++){
                    if(values[i + j] !== values[i] + j){
                        continuous = false;
                        break;
                    }
                }
                if(continuous){
                    let sequence = [];
                    for(let j = 0; j < pathSize; j++){
                        sequence.push(indexBuilder(primary, values[i + j]));
                    }
                    sequences.push(sequence);
                }
            }
        }
        return sequences;
    }

    fetchPathTileIndexes(borderTiles, width, height, borderOuterWalls, pathSize)
    {
        if(1 < pathSize){
            let sequences = this.findContinuousBorderSequences(borderTiles, width, height, pathSize);
            if(0 < sequences.length){
                return sc.randomValueFromArray(sequences);
            }
        }
        let randomBorderTile = this.fetchRandomBorderTileIndex(borderTiles, width, height, borderOuterWalls);
        let pathTileIndexes = [randomBorderTile];
        if(1 < pathSize){
            let additionalTiles = this.findAdjacentBorderTiles(borderTiles, randomBorderTile, width, pathSize - 1);
            pathTileIndexes = [...pathTileIndexes, ...additionalTiles];
        }
        return pathTileIndexes;
    }

    fetchRandomBorderTileIndex(borderTiles, width, height, borderOuterWalls)
    {
        let minDistanceInTiles = borderOuterWalls ? 5 : 1;
        let tilesWithDistance = [];
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            let {row, column} = this.layerDataFactory.rowAndColumnByTileIndex(index, width);
            let x = column;
            let y = row;
            let distToEdge = Math.min(x, width - minDistanceInTiles - x, y, height - minDistanceInTiles - y);
            if(0 === distToEdge){
                tilesWithDistance.push({ index, distToEdge });
            }
        }
        tilesWithDistance.sort(function(a, b)
        {
            return a.distToEdge - b.distToEdge;
        });
        return sc.randomValueFromArray(tilesWithDistance).index;
    }

    findAdjacentBorderTiles(borderTiles, startIndex, width, count)
    {
        let result = [];
        if(0 === borderTiles.length){
            return result;
        }
        if(0 >= count){
            return result;
        }
        let startPosition = this.layerDataFactory.rowAndColumnByTileIndex(startIndex, width);
        let startX = startPosition.column;
        let startY = startPosition.row;
        let sortedTiles = [];
        for(let i = 0; i < borderTiles.length; i++){
            let index = borderTiles[i];
            if(index === startIndex){
                continue;
            }
            let {row, column} = this.layerDataFactory.rowAndColumnByTileIndex(index, width);
            let x = column;
            let y = row;
            let distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            sortedTiles.push({index, distance});
        }
        sortedTiles.sort(function(a, b){
            return a.distance - b.distance;
        });
        for(let i = 0; i < count && i < sortedTiles.length; i++){
            result.push(sortedTiles[i].index);
        }
        return result;
    }

}

module.exports.SpotBorderAnalyzer = SpotBorderAnalyzer;
