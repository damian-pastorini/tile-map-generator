/**
 *
 * Reldens - Tile Map Generator - MapDataMapper
 *
 */

const { sc } = require('@reldens/utils');

class MapDataMapper
{

    static fromProvider(props, mapFileName, elementsProvider)
    {
        let optimizedMap = elementsProvider.optimizedMap;
        let optimizedTileset = optimizedMap.tilesets[0];
        return Object.assign(
            sc.deepJsonClone(props),
            {
                mapFileName: mapFileName+'.json',
                tileSize: optimizedMap.tilewidth,
                tileSheetPath: elementsProvider.fileHandler.joinPaths('generated', optimizedTileset.image),
                tileSheetName: mapFileName+'.png' || optimizedTileset.image,
                layerElements: elementsProvider.croppedElements,
                elementsQuantity: elementsProvider.elementsQuantity,
                groundTile: elementsProvider.groundTile,
                groundTiles: elementsProvider.groundTiles,
                pathTile: elementsProvider.pathTile,
                randomGroundTiles: elementsProvider.randomGroundTiles,
                surroundingTiles: elementsProvider.surroundingTiles,
                corners: elementsProvider.corners,
                bordersTiles: elementsProvider.bordersTiles,
                imageHeight: optimizedTileset.imageheight,
                imageWidth: optimizedTileset.imagewidth,
                tileCount: optimizedTileset.tilecount,
                columns: optimizedTileset.columns,
                margin: optimizedTileset.margin,
                spacing: optimizedTileset.spacing,
                tiles: optimizedTileset.tiles,
            }
        );
    }

}

module.exports.MapDataMapper = MapDataMapper;
