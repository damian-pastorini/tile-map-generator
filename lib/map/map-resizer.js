/**
 *
 * Reldens - Tile Map Generator - MapResizer
 *
 * Standalone post-generation op (like ElementMover / ElementDeleter, NOT wired into the generator pipeline).
 * Crops a map by removing columns/rows from an anchor side, delegating to the existing package ops: element
 * out-of-bounds detection and translation via ElementMover, element bounds via ElementsFromLayersLoader,
 * element-layer rebuild via ElementsToLayersBuilder, static-layer crop via LayerDataFactory and the border
 * re-stamp via MapBorderStamper. Operates on the (mapJson, mapElements) pair and returns {success, offending? error?}.
 *
 */

const { LayerDataFactory } = require('./layer-data-factory');
const { ElementMover } = require('./element-mover');
const { ElementsToLayersBuilder } = require('./elements-to-layers-builder');
const { MapBorderStamper } = require('./map-border-stamper');
const { ElementsFromLayersLoader } = require('../loader/elements-from-layers-loader');

class MapResizer
{

    constructor()
    {
        this.layerDataFactory = new LayerDataFactory();
        this.elementMover = new ElementMover();
        this.elementsBuilder = new ElementsToLayersBuilder();
        this.elementsLoader = new ElementsFromLayersLoader();
        this.borderStamper = new MapBorderStamper();
    }

    resize(mapJson, mapElements, params)
    {
        let removeHorizontal = this.clampAmount(params.removeHorizontal);
        let removeVertical = this.clampAmount(params.removeVertical);
        let newWidth = mapJson.width - removeHorizontal;
        let newHeight = mapJson.height - removeVertical;
        if(0 >= newWidth || 0 >= newHeight){
            return {success: false, offending: [], error: 'invalidDimensions'};
        }
        let removals = this.computeRemovals(params.anchor, removeHorizontal, removeVertical);
        let offending = this.prepareRecord(mapElements, removals, newWidth, newHeight, true === params.force);
        if(0 < offending.length){
            return {success: false, offending};
        }
        this.cropStaticLayers(mapJson, newWidth, newHeight, removals);
        mapJson.width = newWidth;
        mapJson.height = newHeight;
        this.elementsBuilder.apply(mapJson, mapElements);
        this.borderStamper.restamp(mapJson, mapElements.bordersLayer, newWidth, newHeight);
        return {success: true, offending: []};
    }

    clampAmount(value)
    {
        let amount = Number(value);
        if(!Number.isFinite(amount) || 0 > amount){
            return 0;
        }
        return Math.floor(amount);
    }

    computeRemovals(anchor, removeHorizontal, removeVertical)
    {
        return {
            left: this.anchoredRemoval(
                removeHorizontal,
                -1 !== anchor.indexOf('right'),
                -1 !== anchor.indexOf('center')
            ),
            top: this.anchoredRemoval(
                removeVertical,
                -1 !== anchor.indexOf('bottom'),
                -1 === anchor.indexOf('top') && -1 === anchor.indexOf('bottom')
            )
        };
    }

    anchoredRemoval(total, removeFromFarSide, removeCentered)
    {
        if(removeFromFarSide){
            return total;
        }
        if(removeCentered){
            return Math.floor(total / 2);
        }
        return 0;
    }

    prepareRecord(mapElements, removals, newWidth, newHeight, force)
    {
        if(force){
            this.cropRecord(mapElements, removals, newWidth, newHeight);
            return [];
        }
        let offending = this.findOutOfBounds(mapElements, removals, newWidth, newHeight);
        if(0 < offending.length){
            return offending;
        }
        this.translateRecord(mapElements, removals);
        return [];
    }

    findOutOfBounds(mapElements, removals, newWidth, newHeight)
    {
        let offending = [];
        for(let element of mapElements.elements){
            if(this.elementMover.anyTileOutOfBounds(element, -removals.left, -removals.top, newWidth, newHeight)){
                offending.push(element.instanceId);
            }
        }
        return offending;
    }

    translateRecord(mapElements, removals)
    {
        for(let element of mapElements.elements){
            this.translateElement(element, -removals.left, -removals.top);
        }
    }

    translateElement(element, deltaCol, deltaRow)
    {
        for(let elementLayer of element.layers){
            this.translateTiles(elementLayer.tiles, deltaCol, deltaRow);
        }
        element.bounds = this.elementsLoader.computeBounds(element.layers);
    }

    translateTiles(tiles, deltaCol, deltaRow)
    {
        for(let tile of tiles){
            tile.col += deltaCol;
            tile.row += deltaRow;
        }
    }

    cropRecord(mapElements, removals, newWidth, newHeight)
    {
        let keptElements = [];
        for(let element of mapElements.elements){
            if(this.cropElement(element, removals, newWidth, newHeight)){
                keptElements.push(element);
            }
        }
        mapElements.elements = keptElements;
    }

    cropElement(element, removals, newWidth, newHeight)
    {
        let keptLayers = [];
        for(let elementLayer of element.layers){
            elementLayer.tiles = this.cropTiles(elementLayer.tiles, removals, newWidth, newHeight);
            if(0 < elementLayer.tiles.length){
                keptLayers.push(elementLayer);
            }
        }
        if(0 === keptLayers.length){
            return false;
        }
        element.layers = keptLayers;
        element.bounds = this.elementsLoader.computeBounds(keptLayers);
        return true;
    }

    cropTiles(tiles, removals, newWidth, newHeight)
    {
        let kept = [];
        for(let tile of tiles){
            let newCol = tile.col - removals.left;
            let newRow = tile.row - removals.top;
            if(0 <= newCol && newCol < newWidth && 0 <= newRow && newRow < newHeight){
                tile.col = newCol;
                tile.row = newRow;
                kept.push(tile);
            }
        }
        return kept;
    }

    cropStaticLayers(mapJson, newWidth, newHeight, removals)
    {
        let oldWidth = mapJson.width;
        let box = {minX: removals.left, minY: removals.top, width: newWidth, height: newHeight};
        for(let mapLayer of mapJson.layers){
            if(this.isStaticTileLayer(mapLayer)){
                mapLayer.data = this.layerDataFactory.cropLayerData(mapLayer.data, oldWidth, box);
                mapLayer.width = newWidth;
                mapLayer.height = newHeight;
            }
        }
    }

    isStaticTileLayer(mapLayer)
    {
        if('tilelayer' !== mapLayer.type){
            return false;
        }
        if(this.elementsLoader.shouldSkipLayer(mapLayer.name)){
            return true;
        }
        return null === this.elementsLoader.elementLayerName.parse(mapLayer.name);
    }

}

module.exports.MapResizer = MapResizer;
