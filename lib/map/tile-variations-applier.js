/**
 *
 * Reldens - Tile Map Generator - TileVariationsApplier
 *
 */

const {LayerDataFactory} = require('./layer-data-factory');

class TileVariationsApplier
{

    constructor()
    {
        this.layerDataFactory = new LayerDataFactory();
    }

    applyTilesVariations(
        applyOnLayerData,
        width,
        height,
        totalTiles,
        variationsTiles,
        variableTilesPercentage,
        checkTileOnLayerData = false,
        checkTileValue = 0
    ){
        if(0 === variationsTiles.length){
            return;
        }
        let tilesToChange = Math.floor(totalTiles * (variableTilesPercentage / 100));
        let applied = 0;
        for(let i = 0; applied < tilesToChange && i < totalTiles; i++){
            let positionX = Math.floor(Math.random() * width);
            let positionY = Math.floor(Math.random() * height);
            let position = this.layerDataFactory.tileIndex(positionY, positionX, width);
            if(!checkTileOnLayerData || checkTileValue === checkTileOnLayerData[position]){
                applyOnLayerData[position] = variationsTiles[Math.floor(Math.random() * variationsTiles.length)];
                applied++;
            }
        }
        return applyOnLayerData;
    }

}

module.exports.TileVariationsApplier = TileVariationsApplier;
