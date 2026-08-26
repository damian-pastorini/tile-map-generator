/**
 *
 * Reldens - Tile Map Generator - GroundSpotsMapper
 *
 * Resolves the ground spot key out of a tile key property value by stripping the position suffix,
 * so spot names containing hyphens are matched instead of being dropped by a segments count.
 *
 */

const { PropertiesMapper } = require('./properties-mapper');

class GroundSpotsMapper
{

    constructor()
    {
        this.positionNames = Object.keys(new PropertiesMapper().surroundingTilesByKey);
        this.cornerKey = 'corner';
    }

    appendSpotNames(groundSpots, propertyValue, newTileId)
    {
        for(let spotName of String(propertyValue).split(',')){
            groundSpots[spotName] = newTileId;
        }
    }

    cleanCornerFromSpotName(spotName)
    {
        if(this.cornerKey === spotName){
            return '';
        }
        if(spotName.endsWith('-'+this.cornerKey)){
            return spotName.substring(0, spotName.length - this.cornerKey.length - 1);
        }
        return spotName;
    }

    matchGroundSpotKey(propertyValue)
    {
        for(let positionName of this.positionNames){
            if(!propertyValue.endsWith('-'+positionName)){
                continue;
            }
            return this.cleanCornerFromSpotName(
                propertyValue.substring(0, propertyValue.length - positionName.length - 1)
            );
        }
        return '';
    }

}

module.exports.GroundSpotsMapper = GroundSpotsMapper;
