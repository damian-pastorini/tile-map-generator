/**
 *
 * Reldens - Tile Map Generator - BordersPatterns
 *
 */

const { BordersAndCornersTiles } = require('./borders-and-corners-tiles');

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

    applyPatternPipeline(layerData, sequencesData, mapWidth, mapHeight)
    {
        this.replaceSequences(layerData, sequencesData, mapWidth);
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequences(layerData, sequencesData, mapHeight);
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        return layerData;
    }

    applyRotationToCompletePathGrid(pathTile, layerData, mapWidth, mapHeight)
    {
        let singleSpace = [pathTile, 0, pathTile];
        let singleReplace = [pathTile, pathTile, pathTile];
        let doubleSpace = [pathTile, 0, 0, pathTile];
        let doubleReplace = [pathTile, pathTile, pathTile, pathTile];
        while(true){
            this.replaceSequence(layerData, doubleSpace, doubleReplace, mapWidth);
            let applyHorizontalChanges = this.replaceSequence(layerData, singleSpace, singleReplace, mapWidth);
            layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
            this.replaceSequence(layerData, doubleSpace, doubleReplace, mapHeight);
            let applyVerticalChanges = this.replaceSequence(layerData, singleSpace, singleReplace, mapHeight);
            layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
            if(!applyHorizontalChanges && !applyVerticalChanges){
                break;
            }
        }
        return layerData;
    }

    applyBordersAndCornersTiles(layerData, mapWidth, mapHeight, tilesShortcuts)
    {
        let { step1, step2, step3, step4, step5, step6 } = BordersAndCornersTiles.sequences(tilesShortcuts);
        layerData = this.applyRotationToCompletePathGrid(
            tilesShortcuts.p,
            layerData,
            mapWidth,
            mapHeight
        );
        this.replaceSequences(layerData, step1, mapWidth);
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequences(layerData, step2, mapHeight);
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        this.replaceSequences(layerData, step3, mapWidth);
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequences(layerData, step4, mapHeight);
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        this.replaceSequences(layerData, step5, mapWidth);
        layerData = this.rotateLayer90Degrees(layerData, mapWidth, mapHeight);
        this.replaceSequences(layerData, step6, mapHeight);
        layerData = this.rollbackRotation90Degrees(layerData, mapHeight, mapWidth);
        return layerData;
    }

}

module.exports.BordersPatterns = BordersPatterns;
