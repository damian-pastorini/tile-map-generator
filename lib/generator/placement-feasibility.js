/**
 *
 * Reldens - PlacementFeasibility
 *
 */

class PlacementFeasibility
{

    constructor(generator)
    {
        this.generator = generator;
        this.pendingFootprints = [];
    }

    buildPending()
    {
        this.pendingFootprints = [];
        let elementsQuantity = this.generator.elementsQuantity || {};
        for(let elementType of Object.keys(elementsQuantity)){
            this.appendPending(elementType, Number(elementsQuantity[elementType]) || 0);
        }
    }

    appendPending(elementType, quantity)
    {
        let elementLayersDataArray = this.generator.layerElements[elementType];
        if(!elementLayersDataArray){
            return;
        }
        let baseElementData = this.generator.mapLayersComposer.fetchFirstTilesLayer(elementLayersDataArray);
        if(!baseElementData){
            return;
        }
        let freeSpaceAround = this.generator.elementsPlacer.determineElementFreeSpaceAround(elementType);
        let expandedWidth = baseElementData.width + freeSpaceAround * this.generator.requiredForBothSidesDuplicator;
        let expandedHeight = baseElementData.height + freeSpaceAround * this.generator.requiredForBothSidesDuplicator;
        for(let index = 0; index < quantity; index++){
            this.pendingFootprints.push({elementType, width: expandedWidth, height: expandedHeight});
        }
    }

    consume(elementType, elementNumber)
    {
        let fallbackIndex = -1;
        let anyIndex = -1;
        for(let index = 0; index < this.pendingFootprints.length; index++){
            let entry = this.pendingFootprints[index];
            if(elementType !== entry.elementType){
                continue;
            }
            if(entry.moved && elementNumber === entry.elementNumber){
                this.pendingFootprints.splice(index, 1);
                return;
            }
            if(!entry.moved && -1 === fallbackIndex){
                fallbackIndex = index;
            }
            if(-1 === anyIndex){
                anyIndex = index;
            }
        }
        let removeIndex = -1 !== fallbackIndex ? fallbackIndex : anyIndex;
        if(-1 !== removeIndex){
            this.pendingFootprints.splice(removeIndex, 1);
        }
    }

    remainingExcluding(elementType)
    {
        let remaining = [];
        let excluded = false;
        for(let entry of this.pendingFootprints){
            if(!excluded && elementType === entry.elementType){
                excluded = true;
                continue;
            }
            remaining.push(entry);
        }
        return remaining;
    }

    queueMovedElement(journalEntry)
    {
        this.pendingFootprints.push({
            elementType: journalEntry.elementType,
            elementNumber: journalEntry.elementNumber,
            width: journalEntry.width + journalEntry.freeSpaceAround * this.generator.requiredForBothSidesDuplicator,
            height: journalEntry.height + journalEntry.freeSpaceAround * this.generator.requiredForBothSidesDuplicator,
            moved: true
        });
    }

    collectPendingElements()
    {
        let pendingElementPlaceholders = [];
        for(let entry of this.pendingFootprints){
            if(entry.moved){
                pendingElementPlaceholders.push(entry);
            }
        }
        return pendingElementPlaceholders;
    }

    buildValidator(elementType, candidateWidth, candidateHeight, candidateOffset)
    {
        let remaining = this.remainingExcluding(elementType);
        if(0 === remaining.length){
            return null;
        }
        let geometry = this.generator.geometryCalculator;
        let mapWidth = this.generator.mapWidth;
        let mapHeight = this.generator.mapHeight;
        let integral = geometry.buildBlockedIntegral(this.generator.mapGrid, mapWidth, mapHeight);
        let distinctFootprints = geometry.distinctFootprintsByAreaDesc(remaining);
        if(!geometry.canFitAllFootprints(integral, mapWidth, mapHeight, null, distinctFootprints)){
            return false;
        }
        let requiredFreeCells = candidateWidth * candidateHeight;
        for(let entry of remaining){
            requiredFreeCells += entry.width * entry.height;
        }
        return (x, y) => {
            if(mapWidth * mapHeight - integral[integral.length - 1] < requiredFreeCells){
                return false;
            }
            return geometry.canFitAllFootprints(
                integral,
                mapWidth,
                mapHeight,
                {x: x + candidateOffset, y: y + candidateOffset, width: candidateWidth, height: candidateHeight},
                distinctFootprints
            );
        };
    }

}

module.exports.PlacementFeasibility = PlacementFeasibility;
