/**
 *
 * Reldens - Tile Map Generator - MapDataMapper
 *
 */

const { sc } = require('@reldens/utils');

class MapDataMapper
{

    static fromProvider(props, mapName, elementsProvider)
    {
        let optimizedMap = elementsProvider.optimizedMap;
        let optimizedTileset = optimizedMap.tilesets[0];
        return Object.assign(
            sc.deepJsonClone(props),
            {
                mapName,
                mapFileName: mapName+'.json',
                tileSize: optimizedMap.tilewidth,
                tileSheetPath: elementsProvider.fileHandler.joinPaths('generated', optimizedTileset.image),
                tileSheetName: mapName+'.png' || optimizedTileset.image,
                layerElements: elementsProvider.croppedElements,
                elementsQuantity: elementsProvider.elementsQuantity,
                elementsFreeSpaceAround: elementsProvider.elementsFreeSpaceAround,
                allowPathsInFreeSpace: elementsProvider.allowPathsInFreeSpace,
                mapCenteredElements: elementsProvider.mapCenteredElements,
                sortPositionsRelativeToTheMapCenter: elementsProvider.sortPositionsRelativeToTheMapCenter,
                autoMergeLayersByKeys: elementsProvider.autoMergeLayersByKeys,
                specialLayers: elementsProvider.specialLayers,
                groundTile: elementsProvider.groundTile,
                groundTiles: elementsProvider.groundTiles,
                pathTile: elementsProvider.pathTile,
                randomGroundTiles: elementsProvider.randomGroundTiles,
                surroundingTiles: elementsProvider.surroundingTiles,
                corners: elementsProvider.corners,
                bordersTiles: elementsProvider.bordersTiles,
                minimumDistanceFromBorders: elementsProvider.minimumDistanceFromBorders,
                placeElementsCloserToBorders: elementsProvider.placeElementsCloserToBorders,
                freeSpaceMultiplier: elementsProvider.freeSpaceMultiplier,
                freeTilesMultiplier: elementsProvider.freeTilesMultiplier,
                pathSize: elementsProvider.pathSize,
                imageHeight: optimizedTileset.imageheight,
                imageWidth: optimizedTileset.imagewidth,
                tileCount: optimizedTileset.tilecount,
                columns: optimizedTileset.columns,
                margin: optimizedTileset.margin,
                spacing: optimizedTileset.spacing,
                tiles: optimizedTileset.tiles
            }
        );
    }

}

module.exports.MapDataMapper = MapDataMapper;
