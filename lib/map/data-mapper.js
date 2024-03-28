/**
 *
 * Reldens - Tile Map Generator - MapDataMapper
 *
 */

class MapDataMapper
{

    static fromProvider(props, mapFileName, elementsProvider)
    {
        let optimizedMap = elementsProvider.optimizedMap;
        let optimizedTileset = optimizedMap.tilesets[0];
        return {
            rootFolder: props.rootFolder,
            mapFileName: mapFileName + '.json',
            tileSize: optimizedMap.tilewidth,
            tileSheetPath: elementsProvider.fileHandler.joinPaths('generated', optimizedTileset.image),
            tileSheetName: mapFileName + '.png' || optimizedTileset.image,
            imageHeight: optimizedTileset.imageheight,
            imageWidth: optimizedTileset.imagewidth,
            tileCount: optimizedTileset.tilecount,
            columns: optimizedTileset.columns,
            margin: optimizedTileset.margin,
            spacing: optimizedTileset.spacing,
            tiles: optimizedTileset.tiles,
            layerElements: elementsProvider.croppedElements,
            elementsQuantity: elementsProvider.elementsQuantity,
            groundTile: elementsProvider.groundTile,
            groundTiles: elementsProvider.groundTiles,
            mainPathSize: props.mainPathSize || 3,
            blockMapBorder: props.blockMapBorder,
            freeSpaceTilesQuantity: props.freeSpaceTilesQuantity,
            variableTilesPercentage: props.variableTilesPercentage,
            pathTile: elementsProvider.pathTile,
            collisionLayersForPaths: props.collisionLayersForPaths || ['change-points', 'collisions'],
            randomGroundTiles: elementsProvider.randomGroundTiles,
            surroundingTiles: elementsProvider.surroundingTiles,
            corners: elementsProvider.corners,
            bordersTiles: elementsProvider.bordersTiles,
            writeCroppedElementsFiles: props.writeCroppedElementsFiles,
            placeElementsOrder: props.placeElementsOrder,
            orderElementsBySize: props.orderElementsBySize,
            randomizeQuantities: props.randomizeQuantities,
            associatedMapsConfig: props.associatedMapsConfig || {},
            generatedChangePoints: props.generatedChangePoints || {},
            previousMainPath: props.previousMainPath || [],
        };
    }

}

module.exports.MapDataMapper = MapDataMapper;
