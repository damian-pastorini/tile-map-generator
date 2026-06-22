/**
 *
 * Reldens - MapLayersComposer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class MapLayersComposer
{

    constructor(generator)
    {
        this.generator = generator;
    }

    generateLayersList()
    {
        this.generator.staticLayers = this.generator.spotLayersBuilder.generateInvisibleSpots(
            this.generator.staticLayers,
            this.generator.generatedSpots,
            this.generator.mapWidth,
            this.generator.mapHeight,
            this.generator.spotPlacement,
            this.generator.generateLayerWithData.bind(this.generator)
        );
        let groundLayer = this.generator.generateLayerWithData('ground', this.generator.groundLayerData);
        if(!this.generator.removeGroundLayer){
            this.generator.staticLayers.push(groundLayer);
        }
        if(this.generator.blockMapBorder && sc.isArray(this.generator.borderLayer)){
            this.generator.staticLayers.push(
                this.generator.generateLayerWithData('collisions-map-border', this.generator.borderLayer)
            );
        }
        if(0 < this.generator.groundVariationsLayerData.length){
            this.generator.staticLayers.push(
                this.generator.generateLayerWithData('ground-variations', this.generator.groundVariationsLayerData)
            );
        }
        if(this.generator.pathLayerData){
            if(this.generator.applyGroundAsPathTilePostProcess){
                this.generator.pathLayerData = this.generator.pathLayerData.map(
                    tile => tile === this.generator.pathTile ? this.generator.groundTile : tile
                );
            }
            let pathLayer = this.generator.generateLayerWithData('path', this.generator.pathLayerData);
            pathLayer.properties = this.generator.pathLayerProperties;
            this.generator.staticLayers.push(pathLayer);
        }
        if(this.isValidLayer(this.generator.pathInnerWallsLayer)){
            this.generator.staticLayers.push(
                this.generator.generateLayerWithData(
                    'path-borders-inner-walls'+this.generator.splitBordersLayerSuffix,
                    this.generator.pathInnerWallsLayer
                )
            );
        }
        if(sc.isArray(this.generator.pathOuterWallsLayer) && 0 < this.generator.pathOuterWallsLayer.length){
            this.generator.staticLayers.push(
                this.generator.generateLayerWithData(
                    'path-borders-outer-walls'+this.generator.splitBordersLayerSuffix,
                    this.generator.pathOuterWallsLayer
                )
            );
        }
        if(this.generator.splitBordersInLayers
            && this.generator.splitBorderLayer
            && 0 < this.generator.splitBorderLayer.length){
            this.generator.staticLayers.push(
                this.generator.generateLayerWithData(
                    'path-borders'+this.generator.splitBordersLayerSuffix,
                    this.generator.splitBorderLayer
                )
            );
        }
        let layers = [...this.mergeLayersByTileValue(this.generator.staticLayers, this.generator.additionalLayers)];
        layers = this.reorderLayersBasedOnSpots(layers);
        for(let i = 0; i < layers.length; i++){
            if(layers[i].data){
                layers[i].data = this.replaceNullTiles(layers[i].data, layers[i].name);
            }
        }
        layers = layers.filter(layer => {
            let keepLayer = layer.data.some(tile => tile !== 0);
            if(!keepLayer){
                Logger.debug('Empty layer will be removed: '+layer.name);
            }
            return keepLayer;
        });
        Logger.debug('Total layers before merge: '+layers.length);
        this.generator.preMergeLayers = sc.deepJsonClone(layers);
        if(0 < this.generator.autoMergeLayersByKeys.length){
            for(let matchKey of this.generator.autoMergeLayersByKeys){
                layers = this.mergeLayersByNameSubstring(layers, matchKey);
            }
        }
        Logger.debug('Total layers after merge: '+layers.length);
        layers = this.applyLayersIds(layers);
        return layers;
    }

    isValidLayer(layerData)
    {
        let isArray = sc.isArray(layerData);
        return isArray && 0 < layerData.length;
    }

    replaceNullTiles(layerData, layerName)
    {
        return layerData.map((tile) => {
            let isNullTile = null === tile;
            if(isNullTile){
                Logger.error('There is a NULL tile in the layer "'+layerName+'" data.');
            }
            return isNullTile ? 0 : tile;
        });
    }

    applyLayersIds(layers)
    {
        let id = 1;
        for(let layer of layers){
            layer.id = id;
            id++;
        }
        return layers;
    }

    reorderLayersBasedOnSpots(layers)
    {
        if(0 === Object.keys(this.generator.generateSpotsWithDepth).length){
            return layers;
        }
        let layerMap = new Map();
        for(let i = 0; i < layers.length; i++){
            layerMap.set(layers[i].name, i);
        }
        let reorderedLayers = [...layers];
        let spotKeys = Object.keys(this.generator.generateSpotsWithDepth);
        for(let i = 0; i < spotKeys.length; i++){
            let spotKey = spotKeys[i];
            let spotConfig = this.generator.generateSpotsWithDepth[spotKey];
            let layerNames = Object.keys(spotConfig.spotLayers);
            for(let j = 0; j < layerNames.length; j++){
                let layerName = layerNames[j];
                let currentIndex = layerMap.get(layerName);
                if(null === currentIndex || 0 === currentIndex || 0 < currentIndex){
                    this.reorderLayerBySpotDepth(
                        reorderedLayers,
                        layerMap,
                        layerName,
                        currentIndex,
                        spotConfig.depth,
                        layers.length
                    );
                }
            }
        }
        return reorderedLayers;
    }

    reorderLayerBySpotDepth(reorderedLayers, layerMap, layerName, currentIndex, spotDepth, layersLength)
    {
        let targetIndex = this.calculateTargetIndex(spotDepth, layersLength, layerMap, reorderedLayers);
        let layerToMove = reorderedLayers[currentIndex];
        reorderedLayers.splice(currentIndex, 1);
        reorderedLayers.splice(targetIndex, 0, layerToMove);
        this.updateLayerMap(reorderedLayers, layerMap);
        Logger.debug('Reordered layer '+layerName+' to depth '+targetIndex+' based on spot configuration');
    }

    calculateTargetIndex(spotDepth, layersLength, layerMap)
    {
        let resolvedIndex = spotDepth;
        if(!spotDepth){
            return 1;
        }
        if('string' === typeof spotDepth){
            let referenceLayerIndex = layerMap.get(spotDepth);
            if(null === referenceLayerIndex || 0 === referenceLayerIndex || 0 < referenceLayerIndex){
                return referenceLayerIndex + 1;
            }
            return 1;
        }
        if(0 >= spotDepth){
            return 1;
        }
        if(layersLength <= spotDepth){
            return layersLength - 1;
        }
        return resolvedIndex;
    }

    updateLayerMap(layers, layerMap)
    {
        for(let i = 0; i < layers.length; i++){
            layerMap.set(layers[i].name, i);
        }
    }

    mergeLayersByNameSubstring(layers, matchKey)
    {
        let used = new Set();
        let result = [];
        for(let i = 0; i < layers.length; i++){
            if(used.has(i)){
                continue;
            }
            let current = layers[i];
            if(!current.name.includes(matchKey)){
                result.push(current);
                continue;
            }
            let data = [...current.data];
            let name = current.name;
            for(let j = i + 1; j < layers.length; j++){
                let mergeResult = this.tryMergeCandidate(layers, j, used, matchKey, data, name);
                data = mergeResult.data;
                name = mergeResult.name;
            }
            result.push({...current, name: "merge-" + name, data});
        }
        return result;
    }

    tryMergeCandidate(layers, j, used, matchKey, data, name)
    {
        if(used.has(j)){
            return {data, name};
        }
        let candidate = layers[j];
        if(!candidate.name.includes(matchKey)){
            return {data, name};
        }
        let collision = this.hasTileCollision(data, candidate.data);
        if(!collision){
            data = this.generator.layerDataFactory.mergeTileArrays(data, candidate.data);
            name += "-" + candidate.name;
            used.add(j);
        }
        return {data, name};
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

    mergeLayersByTileValue(staticLayers, additionalLayers)
    {
        let combinedLayers = [...staticLayers, ...additionalLayers];
        let mergedLayersByName = new Map();
        for(let layer of combinedLayers){
            if(mergedLayersByName.has(layer.name)){
                let existingLayer = mergedLayersByName.get(layer.name);
                existingLayer.data = this.generator.layerDataFactory.mergeTileArrays(existingLayer.data, layer.data);
                continue;
            }
            let clonedLayer = sc.deepJsonClone(layer);
            mergedLayersByName.set(layer.name, clonedLayer);
        }
        return Array.from(mergedLayersByName.values());
    }

    mergeLayers(layerA, layerB)
    {
        return this.generator.layerDataFactory.mergeTileArrays(layerB, layerA);
    }

    fetchFirstTilesLayer(elementLayers)
    {
        let firstTileLayer = false;
        for(let layer of elementLayers){
            if('tilelayer' === layer.type){
                firstTileLayer = layer;
                break;
            }
        }
        return firstTileLayer;
    }

}

module.exports.MapLayersComposer = MapLayersComposer;
