/**
 *
 * Reldens - SpotPlacement
 *
 */

class SpotPlacement
{

    constructor(geometryCalculator)
    {
        this.geometryCalculator = geometryCalculator;
    }

    findFreeSpotPlacement(occupiedRects, spotWidth, spotHeight, maxX, maxY)
    {
        let maxAttempts = 30;
        for(let attempt = 0; attempt < maxAttempts; attempt++){
            let candidateX = 0 < maxX ? Math.floor(Math.random() * maxX) : 0;
            let candidateY = 0 < maxY ? Math.floor(Math.random() * maxY) : 0;
            if(!this.rectOverlapsAny(candidateX, candidateY, spotWidth, spotHeight, occupiedRects)){
                return {x: candidateX, y: candidateY};
            }
        }
        return {
            x: 0 < maxX ? Math.floor(Math.random() * maxX) : 0,
            y: 0 < maxY ? Math.floor(Math.random() * maxY) : 0
        };
    }

    rectOverlapsAny(x, y, width, height, occupiedRects)
    {
        let candidateRect = {x, y, width, height};
        for(let rect of occupiedRects){
            if(this.geometryCalculator.rectsOverlap(candidateRect, rect)){
                return true;
            }
        }
        return false;
    }

}

module.exports.SpotPlacement = SpotPlacement;
