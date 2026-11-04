/**
 *
 * Reldens - Tile Map Generator - ElementsProvider
 *
 */

const { PropertiesMapper } = require('./properties-mapper');
const { GeneratedFoldersConstants } = require('../constants');
const { ElementLayerName } = require('../map/element-layer-name');
const { JsonFormatter } = require('../map/json-formatter');
const { LayerDataFactory } = require('../map/layer-data-factory');
const { MapNaming } = require('../map/map-naming');
const { GroundSpotsMapper } = require('./ground-spots-mapper');
const { FileHandler } = require('@reldens/server-utils');
const { TileMapOptimizer } = require('@reldens/tile-map-optimizer');
const { Logger, sc } = require('@reldens/utils');

class ElementsProvider
{

    constructor(props)
    {
        this.elementsLayers = [];
        this.tileMapJSON = sc.get(props, 'tileMapJSON', null);
        this.currentDate = sc.getTime();
        this.defaultMapFileName = 'elements-'+this.currentDate;
        this.mapFileName = sc.get(props, 'mapFileName', this.defaultMapFileName);
        this.factor = sc.get(props, 'factor', 1);
        this.transparentColor = sc.get(props, 'transparentColor', '#000000');
        this.rootFolder = sc.get(props, 'rootFolder', __dirname);
        this.generatedFolder = sc.get(props, 'generatedFolder', FileHandler.joinPaths(this.rootFolder, 'generated'));
        this.optimizedFolder = FileHandler.joinPaths(
            this.generatedFolder,
            GeneratedFoldersConstants.OPTIMIZED_SUB_FOLDER
        );
        this.writeCroppedElementsFiles = sc.get(props, 'writeCroppedElementsFiles', false);
        this.expandElementsSize = sc.get(props, 'expandElementsSize', 0);
        this.tileMapOptimizer = null;
        this.layerDataFactory = new LayerDataFactory();
        this.mapNaming = new MapNaming();
        this.groundSpotsMapper = new GroundSpotsMapper();
        this.elementLayerName = new ElementLayerName();
        this.stairsGroupKeys = ['stairs-up', 'stairs-down'];
        this.croppedElements = {};
        this.elementsQuantity = sc.get(props, 'elementsQuantity', {});
        this.elementsFreeSpaceAround = sc.get(props, 'elementsFreeSpaceAround', {});
        this.allowPathsInFreeSpace = sc.get(props, 'allowPathsInFreeSpace', {});
        this.elementsVariations = sc.get(props, 'elementsVariations', {});
        this.mapCenteredElements = sc.get(props, 'mapCenteredElements', {});
        this.sortPositionsRelativeToTheMapCenter = sc.get(props, 'sortPositionsRelativeToTheMapCenter', true);
        this.autoMergeLayersByKeys = sc.get(props, 'autoMergeLayersByKeys', []);
        this.specialLayers = ['ground', 'path', 'ground-variations', 'borders', 'tileset-ref'];
        this.pathSize = sc.get(props, 'pathSize', 1);
        this.cleanPathBorderTilesFromElements = sc.get(props, 'cleanPathBorderTilesFromElements', false);
        this.minimumDistanceFromBorders = sc.get(props, 'minimumDistanceFromBorders', 1);
        this.placeElementsCloserToBorders = sc.get(props, 'placeElementsCloserToBorders', false);
        this.freeSpaceMultiplier = sc.get(props, 'freeSpaceMultiplier', 1);
        this.freeTilesMultiplier = sc.get(props, 'freeTilesMultiplier', 1);
        this.splitBordersInLayers = sc.get(props, 'splitBordersInLayers', false);
        this.splitBordersLayerSuffix = sc.get(props, 'splitBordersLayerSuffix', '');
        this.applyPathsInnerWalls = sc.get(props, 'applyPathsInnerWalls', false);
        this.pathsInnerWallsTilesKey = sc.get(props, 'pathsInnerWallsTilesKey', 'path');
        this.applyPathsOuterWalls = sc.get(props, 'applyPathsOuterWalls', false);
        this.pathsOuterWallsTilesKey = sc.get(props, 'pathsOuterWallsTilesKey', 'path');
        this.removeGroundLayer = sc.get(props, 'removeGroundLayer', false);
        this.applyGroundAsPathTilePostProcess = sc.get(props, 'applyGroundAsPathTilePostProcess', false);
        this.propertiesMapper = new PropertiesMapper();
        this.groundTile = 0;
        this.groundTiles = [];
        this.randomGroundTiles = [];
        this.bordersTiles = {};
        this.borderInnerCornersTiles = {};
        this.groundSpots = {};
        this.groundSpotsPropertiesMappers = {};
    }

    async splitElements()
    {
        await this.optimizeMap();
        this.elementsLayers = this.splitByLayerName();
        this.croppedElements = {};
        for(let i of Object.keys(this.elementsLayers)){
            if(sc.inArray(i, this.specialLayers)){
                continue;
            }
            let elementLayers = this.elementsLayers[i];
            // @NOTE: all elements layers with the keyword "path" on their name will be merged into a single layer.
            for(let layer of elementLayers){
                if(-1 !== layer.name.indexOf('path')){
                    layer.name = 'path';
                }
            }
            let mapClone = sc.deepJsonClone(this.optimizedMap);
            mapClone.layers = elementLayers;
            mapClone = this.cropMapToMinimumArea(mapClone);
            if(0 < this.expandElementsSize){
                this.expandLayers(mapClone.layers);
            }
            this.croppedElements[i] = mapClone.layers;
            if(this.writeCroppedElementsFiles){
                Logger.info('Writing cropped elements file: '+i+'.json');
                FileHandler.writeFile(
                    FileHandler.joinPaths(this.generatedFolder, i+'.json'),
                    JsonFormatter.mapToJSON(mapClone));
            }
        }
    }

    expandLayers(layers)
    {
        for(let layer of layers){
            let padded = this.layerDataFactory.padLayerData(
                layer.data,
                layer.width,
                layer.height,
                this.expandElementsSize
            );
            layer.data = padded.data;
            layer.width = padded.width;
            layer.height = padded.height;
        }
        return layers;
    }

    splitByLayerName()
    {
        let elementsLayers = {};
        for(let layer of this.tileMapJSON.layers){
            let splitLayerName = layer.name.split('-');
            let nonZeroTiles = sc.isArray(layer.data) ? [...new Set(layer.data.filter((tile) => tile !== 0))] : [];
            if(sc.inArray(layer.name, this.specialLayers)){
                if('ground-variations' === layer.name){
                    this.randomGroundTiles = nonZeroTiles;
                    continue;
                }
                continue;
            }
            if(-1 !== layer.name.indexOf('spot-layer-') && -1 !== layer.name.indexOf('ground-variations-')){
                let tilesKey = String(layer.name).replace('spot-layer-', '').replace('ground-variations-', '');
                if(!this.elementsVariations[tilesKey]){
                    this.elementsVariations[tilesKey] = [];
                }
                this.elementsVariations[tilesKey] = [
                    ...this.elementsVariations[tilesKey],
                    ...nonZeroTiles
                ];
                continue;
            }
            if(3 > splitLayerName.length){
                Logger.error('Invalid layer name: '+layer.name+'. Expected: [elementName]-[index]-[layerName]');
                continue;
            }
            let elementLayerGroup = this.fetchElementLayerGroup(layer.name, splitLayerName);
            if(!elementsLayers[elementLayerGroup]){
                elementsLayers[elementLayerGroup] = [];
            }
            if(layer.properties){
                for(let property of layer.properties){
                    if('quantity' === property.name){
                        this.elementsQuantity[elementLayerGroup] = property.value;
                    }
                    if('freeSpaceAround' === property.name){
                        this.elementsFreeSpaceAround[elementLayerGroup] = property.value;
                    }
                    if('allowPathsInFreeSpace' === property.name){
                        this.allowPathsInFreeSpace[elementLayerGroup] = property.value;
                    }
                    if('mapCentered' === property.name){
                        this.mapCenteredElements[elementLayerGroup] = property.value;
                    }
                }
            }
            elementsLayers[elementLayerGroup].push(layer);
        }
        return elementsLayers;
    }

    fetchElementLayerGroup(layerName, splitLayerName)
    {
        for(let stairsKey of this.stairsGroupKeys){
            if(layerName.startsWith(stairsKey+'-')){
                return stairsKey;
            }
        }
        return this.elementLayerName.parse(layerName)?.instanceId || this.mapNaming.fuseGroupName(splitLayerName);
    }

    cropMapToMinimumArea(map)
    {
        const boundingBox = this.findMinimumBoundingBox(map.layers);
        for(let layer of map.layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            const newData = [];
            for(let y = 0; y < boundingBox.height; y++){
                for(let x = 0; x < boundingBox.width; x++){
                    let oldIndex = (x + boundingBox.minX) + (y + boundingBox.minY) * layer.width;
                    newData.push(layer.data[oldIndex]);
                }
            }
            layer.data = newData;
            layer.width = boundingBox.width;
            layer.height = boundingBox.height;
        }
        map.width = boundingBox.width;
        map.height = boundingBox.height;
        return map;
    }

    findMinimumBoundingBox(layers)
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -1;
        let maxY = -1;
        for(let layer of layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            for(let y = 0; y < layer.height; y++){
                for(let x = 0; x < layer.width; x++){
                    let tileIndex = x + y * layer.width;
                    if(layer.data[tileIndex] !== 0){
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
        }
        return {minX, minY, width: maxX - minX + 1, height: maxY - minY + 1};
    }

    async optimizeMap()
    {
        FileHandler.createFolder(this.optimizedFolder);
        let options = {
            originalJSON: this.tileMapJSON,
            newName: 'optimized-'+this.mapFileName,
            factor: this.factor,
            transparentColor: this.transparentColor,
            rootFolder: this.rootFolder,
            generatedFolder: this.optimizedFolder
        };
        this.tileMapOptimizer = new TileMapOptimizer(options);
        let output = await this.tileMapOptimizer.optimize();
        this.optimizedMap = output.newJSONResized || output.newJSON;
        this.fetchPathTiles();
    }

    fetchPathTiles()
    {
        let tileset = this.optimizedMap.tilesets[0];
        let tiles = tileset?.tiles;
        if(!tiles){
            return;
        }
        this.propertiesMapper.reset();
        for(let tile of tiles){
            if(!sc.isArray(tile.properties)){
                continue;
            }
            for(let property of tile.properties){
                let newTileId = tileset.firstgid + tile.id;
                if(!newTileId){
                    continue;
                }
                if('groundSpots' === property.name){
                    this.groundSpotsMapper.appendSpotNames(this.groundSpots, property.value, newTileId);
                }
                // from here and below we will only deal with tiles with name = "key"
                if('key' !== property.name){
                    continue;
                }
                if('pathTile' === property.value){
                    this.pathTile = newTileId;
                }
                if(0 === this.groundTile && 'groundTile' === property.value){
                    this.groundTile = newTileId;
                }
                if(0 !== this.groundTile && 'groundTile' === property.value && this.groundTile !== newTileId){
                    this.groundTiles.push(newTileId);
                }
                if(0 === property.value.indexOf('border-inner-corner-')){
                    this.borderInnerCornersTiles[property.value.replace('border-inner-corner-', '')] = newTileId;
                    continue;
                }
                if(-1 !== property.value.indexOf('border-')){
                    this.bordersTiles[property.value.replace('border-', '')] = newTileId;
                    continue;
                }
                // if property.value.split('-') gives more than 3 parts it means the first one is the spot key
                // normal values that won't contain 'corner-' will be:
                // [top/middle/bottom]-[left/center/right]
                // values related to spots will be like:
                // [spotKey]-[top/middle/bottom]-[left/center/right]
                let isSurroundingTile = -1 === property.value.indexOf('corner-');
                let spotKey = this.groundSpotsMapper.matchGroundSpotKey(property.value);
                let useSpotPropertyMapper = '' !== spotKey;
                if(useSpotPropertyMapper && !this.groundSpotsPropertiesMappers[spotKey]){
                    this.groundSpotsPropertiesMappers[spotKey] = new PropertiesMapper(spotKey);
                }
                if(isSurroundingTile){
                    if(useSpotPropertyMapper){
                        this.groundSpotsPropertiesMappers[spotKey].mapSurroundingByKey(property.value, newTileId);
                        continue;
                    }
                    this.propertiesMapper.mapSurroundingByKey(property.value, newTileId);
                    continue;
                }
                let cornerKey = property.value;
                let cleanCornerKey = cornerKey.replace('corner-', '');
                if(useSpotPropertyMapper){
                    this.groundSpotsPropertiesMappers[spotKey].mapCornersByKey(cleanCornerKey, newTileId);
                }
                this.propertiesMapper.mapCornersByKey(cleanCornerKey, newTileId);
            }
        }
        if(0 < this.groundTiles.length){
            if(0 !== this.groundTile && -1 === this.groundTiles.indexOf(this.groundTile)){
                this.groundTiles.push(this.groundTile);
            }
            if(-1 !== this.groundTiles.indexOf(0)){
                this.groundTiles.splice(this.groundTiles.indexOf(0), 1);
            }
            this.groundTile = 0;
        }
        this.surroundingTiles = this.propertiesMapper.surroundingTiles;
        this.corners = this.propertiesMapper.corners;
    }
}

module.exports.ElementsProvider = ElementsProvider;
