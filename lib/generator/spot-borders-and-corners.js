/**
 *
 * Reldens - SpotBordersAndCorners
 *
 */

class SpotBordersAndCorners
{

    constructor(geometryCalculator, bordersPatterns)
    {
        this.geometryCalculator = geometryCalculator;
        this.bordersPatterns = bordersPatterns;
    }

    applySplitBordersAndCorners(applyCornersTiles, width, height, splitBordersInLayers, mainLayer, tilesShortcuts)
    {
        if(!applyCornersTiles){
            return mainLayer;
        }
        let splitBordersLayer = [...mainLayer];
        let bordersLayer = this.bordersPatterns.applyBordersAndCornersTiles(
            splitBordersLayer,
            width,
            height,
            tilesShortcuts
        );
        if(!splitBordersInLayers){
            return bordersLayer;
        }
        bordersLayer = bordersLayer.map(tile => tile === tilesShortcuts.p ? 0 : tile);
        for(let i = 0; i < bordersLayer.length; i++){
            if(-1 !== [tilesShortcuts.cBL, tilesShortcuts.cBR].indexOf(bordersLayer[i])){
                mainLayer[i] = tilesShortcuts.p;
            }
        }
        return bordersLayer;
    }

    applyBorderEndTiles(bordersLayer, pathTileIndexes, removedBorders, spotTiles, layerWidth, layerHeight)
    {
        let {p, sTL, sTC, sTR, sML, sMR, sBL, sBC, sBR, cTL, cTR, cBL, cBR} = spotTiles;
        let connectionsData = {};
        let filteredFirstAndLastTiles = pathTileIndexes.filter((tileIndex) => {
            let tileConnections = this.geometryCalculator.connectedTiles(tileIndex, bordersLayer, layerWidth);
            let tileConnectionsCount = this.geometryCalculator.countConnected(tileConnections);
            let singleConnection = 1 === tileConnectionsCount.total;
            if(singleConnection){
                connectionsData[tileIndex] = {tileConnections, tileConnectionsCount};
            }
            return singleConnection;
        });
        for(let tileIndex of filteredFirstAndLastTiles){
            let isLeft = 0 !== connectionsData[tileIndex].tileConnections.left;
            let isTop = 0 !== connectionsData[tileIndex].tileConnections.top;
            if(removedBorders[tileIndex] === sBC || removedBorders[tileIndex] === sTL){
                bordersLayer[tileIndex] = isLeft ? cBL : cBR;
                if(0 === bordersLayer[tileIndex + layerWidth]){
                    bordersLayer[tileIndex + layerWidth] = isLeft ? cTL : cTR;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sTC || removedBorders[tileIndex] === sTR){
                bordersLayer[tileIndex] = isLeft ? cTL : cTR;
                if(0 === bordersLayer[tileIndex - layerWidth]){
                    bordersLayer[tileIndex - layerWidth] = isLeft ? cBL : cBR;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sML || removedBorders[tileIndex] === sBL){
                bordersLayer[tileIndex] = isTop ? cTL : cBL;
                if(0 === bordersLayer[tileIndex - 1]){
                    bordersLayer[tileIndex - 1] = isTop ? cTR : cBR;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sMR || removedBorders[tileIndex] === sBR){
                bordersLayer[tileIndex] = isTop ? cTR : cBR;
                if(0 === bordersLayer[tileIndex + 1]){
                    bordersLayer[tileIndex + 1] = isTop ? cTL : cBL;
                }
                continue;
            }
            if(removedBorders[tileIndex] === sBL){
                bordersLayer[tileIndex] = isTop ? cTR : cBR;
            }
            if(removedBorders[tileIndex] === sBR){
                bordersLayer[tileIndex] = isTop ? cTL : cBL;
            }
        }
        this.bordersPatterns.replaceSequences(
            bordersLayer,
            [
                [[cBR, sTC], [cTR, sTC]],
                [[sBC, cBR, cBL], [sBC, sBC, cBL]],
                [[cBR, cBL, sBC], [cBR, sBC, sBC]]
            ],
            layerWidth
        );
        bordersLayer = this.bordersPatterns.rotateLayer90Degrees(bordersLayer, layerWidth, layerHeight);
        this.bordersPatterns.replaceSequences(
            bordersLayer,
            [
                [[cBR, cTR, sMR], [cBR, sMR, sMR]],
                [[0, cTR, cTR], [0, cTR, 0]]
            ],
            layerHeight
        );
        bordersLayer = this.bordersPatterns.rollbackRotation90Degrees(bordersLayer, layerHeight, layerWidth);
        return bordersLayer;
    }

}

module.exports.SpotBordersAndCorners = SpotBordersAndCorners;
