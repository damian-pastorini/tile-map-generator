/**
 *
 * Reldens - Tile Map Generator - BordersPatterns
 *
 */

class BordersPatterns
{

    replaceSequences(layerData, sequencesData, mapWidth)
    {
        for(let i = 0; i < sequencesData.length; i++){
            this.replaceSequence(layerData, sequencesData[i][0], sequencesData[i][1], mapWidth);
        }
    }

    replaceSequence(layerData, originalSequence, replaceSequence, mapWidth)
    {
        let clonedArray = [...layerData];
        let originalSeqArray = originalSequence.map(Number);
        let replaceSeqArray = replaceSequence.map(Number);
        for(let i = 0; i <= layerData.length - originalSeqArray.length; i++){
            let skip = false;
            for(let offset = 1; offset < originalSeqArray.length; offset++){
                if(Math.floor((i + offset) / mapWidth) !== Math.floor(i / mapWidth)){
                    skip = true;
                    break;
                }
            }
            if(skip){
                continue;
            }
            if(layerData.slice(i, i + originalSeqArray.length).every((value, index) => value === originalSeqArray[index])){
                layerData.splice(i, originalSeqArray.length, ...replaceSeqArray);
            }
        }
        return clonedArray === layerData;
    }

    rotateLayer90Degrees(layerData, layerWidth, layerHeight)
    {
        let newWidth = layerHeight;
        let newHeight = layerWidth;
        let rotatedMap = new Array(layerData.length).fill(0);
        for(let row = 0; row < layerHeight; row++){
            for(let column = 0; column < layerWidth; column++){
                let originalIndex = row * layerWidth + column;
                let rotatedIndex = row + (newHeight - column - 1) * newWidth;
                rotatedMap[rotatedIndex] = layerData[originalIndex];
            }
        }
        return rotatedMap;
    }

    rollbackRotation90Degrees(layerData, layerWidth, layerHeight)
    {
        let originalWidth = layerHeight;
        let rotatedMap = new Array(layerData.length).fill(0);
        for(let row = 0; row < layerHeight; row++){
            for(let column = 0; column < layerWidth; column++){
                let rotatedIndex = row * layerWidth + column;
                let originalIndex = column * originalWidth + (layerHeight - row - 1);
                rotatedMap[originalIndex] = layerData[rotatedIndex];
            }
        }
        return rotatedMap;
    }

}

module.exports.BordersPatterns = BordersPatterns;
