/**
 *
 * Reldens - SpotFillProcessor
 *
 */

class SpotFillProcessor
{

    constructor(layerDataFactory, geometryCalculator, mapLayersComposer)
    {
        this.layerDataFactory = layerDataFactory;
        this.geometryCalculator = geometryCalculator;
        this.mapLayersComposer = mapLayersComposer;
    }

    fillInternalHolesAndBalancePerimeter(layerData, width, height, tileIndex, applyBorders)
    {
        let minX = applyBorders ? 1 : 0;
        let maxX = applyBorders ? width - 2 : width - 1;
        let minY = applyBorders ? 1 : 0;
        let maxY = applyBorders ? height - 2 : height - 1;
        let replacedTiles = 0;
        for(let y = minY; y <= maxY; y++){
            for(let x = minX; x <= maxX; x++){
                let index = this.layerDataFactory.tileIndex(y, x, width);
                if(0 !== layerData[index]){
                    continue;
                }
                if(this.isInternalHole(x, y, layerData, width, height)){
                    layerData[index] = tileIndex;
                    replacedTiles++;
                }
            }
        }
        return layerData;
    }

    isInternalHole(x, y, layerData, width, height)
    {
        let surroundingTiles = 0;
        for(let dy = -1; dy <= 1; dy++){
            for(let dx = -1; dx <= 1; dx++){
                if(0 === dx && 0 === dy){
                    continue;
                }
                let nx = x + dx;
                let ny = y + dy;
                if(!this.geometryCalculator.isPositionWithinBounds(nx, ny, width, height)){
                    continue;
                }
                let neighborIndex = ny * width + nx;
                if(0 !== layerData[neighborIndex]){
                    surroundingTiles++;
                }
            }
        }
        return surroundingTiles >= 6;
    }

    fillEmptyTilesBetweenBordersAndSpotGround(spotLayer, bordersLayer, width, height, spotTile)
    {
        let spotLayerClone = [...spotLayer];
        let mergedLayer = this.mapLayersComposer.mergeLayers(spotLayerClone, [...bordersLayer]);
        let resultLayer = [...spotLayerClone];
        for(let y = 0; y < height; y++){
            let rowStart = y * width;
            let row = mergedLayer.slice(rowStart, rowStart + width);
            let firstNonZeroIndex = -1;
            for(let x = 0; x < width; x++){
                if(0 === row[x]){
                    continue;
                }
                if(-1 !== firstNonZeroIndex){
                    if(0 !== spotLayerClone[rowStart + firstNonZeroIndex] || 0 !== spotLayerClone[rowStart + x]){
                        for(let fillX = firstNonZeroIndex + 1; fillX < x; fillX++){
                            resultLayer[rowStart + fillX] = spotTile;
                        }
                    }
                }
                firstNonZeroIndex = x;
            }
        }
        for(let x = 0; x < width; x++){
            let firstNonZeroIndex = -1;
            for(let y = 0; y < height; y++){
                let index = y * width + x;
                if(0 === mergedLayer[index]){
                    continue;
                }
                if(-1 !== firstNonZeroIndex){
                    if(0 !== spotLayerClone[firstNonZeroIndex * width + x] || 0 !== spotLayerClone[y * width + x]){
                        for(let fillY = firstNonZeroIndex + 1; fillY < y; fillY++){
                            resultLayer[fillY * width + x] = spotTile;
                        }
                    }
                }
                firstNonZeroIndex = y;
            }
        }
        return resultLayer;
    }

    fillAllTiles(layerData, width, height, tileIndex, applyBorders)
    {
        if(!applyBorders){
            for(let i = 0; i < layerData.length; i++){
                layerData[i] = tileIndex;
            }
            return layerData;
        }
        if(width <= 2 || height <= 2){
            return layerData;
        }
        for(let y = 1; y < height - 1; y++){
            for(let x = 1; x < width - 1; x++){
                let index = this.layerDataFactory.tileIndex(y, x, width);
                layerData[index] = tileIndex;
            }
        }
        return layerData;
    }

    computeTotalTiles(width, height, applyBorders)
    {
        if(!applyBorders){
            return width * height;
        }
        if(width <= 2 || height <= 2){
            return 0;
        }
        return (width - 2) * (height - 2);
    }

    increaseLayerSize(layerData, width, height, extraTiles)
    {
        let paddedLayer = this.layerDataFactory.padLayerData(layerData, width, height, extraTiles);
        return {
            width: paddedLayer.width,
            height: paddedLayer.height,
            layerData: paddedLayer.data
        };
    }

}

module.exports.SpotFillProcessor = SpotFillProcessor;
