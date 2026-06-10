/**
 *
 * Reldens - Tile Map Generator - MapDataMapper
 *
 */

const { GeneratedFoldersConstants } = require('../generator/generated-folders-constants');
const { sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class MapDataMapper
{

    static resolveRelativeGeneratedFolder(props, elementsProvider)
    {
        let baseFolder = sc.get(props, 'rootFolder', '');
        if(!baseFolder){
            return FileHandler.joinPaths('generated', GeneratedFoldersConstants.OPTIMIZED_SUB_FOLDER);
        }
        return FileHandler.getRelativePath(baseFolder, elementsProvider.optimizedFolder);
    }

    static buildTileSheetPath(props, elementsProvider)
    {
        return FileHandler.joinPaths(
            MapDataMapper.resolveRelativeGeneratedFolder(props, elementsProvider),
            elementsProvider.optimizedMap.tilesets[0].image
        );
    }

    static fromOptimizedMap(elementsProvider)
    {
        let optimizedTileset = elementsProvider.optimizedMap.tilesets[0];
        let result = {tileSize: elementsProvider.optimizedMap.tilewidth};
        result.optimizedMapFirstTileset = optimizedTileset;
        result.imageHeight = optimizedTileset.imageheight;
        result.imageWidth = optimizedTileset.imagewidth;
        result.tileCount = optimizedTileset.tilecount;
        result.columns = optimizedTileset.columns;
        result.margin = optimizedTileset.margin;
        result.spacing = optimizedTileset.spacing;
        result.tiles = optimizedTileset.tiles;
        return result;
    }

    static fromElementsProvider(elementsProvider)
    {
        return {
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
            groundSpotsPropertiesMappers: elementsProvider.groundSpotsPropertiesMappers,
            factor: elementsProvider.factor,
            elementsVariations: elementsProvider.elementsVariations,
            minimumDistanceFromBorders: elementsProvider.minimumDistanceFromBorders,
            placeElementsCloserToBorders: elementsProvider.placeElementsCloserToBorders,
            freeSpaceMultiplier: elementsProvider.freeSpaceMultiplier,
            freeTilesMultiplier: elementsProvider.freeTilesMultiplier,
            pathSize: elementsProvider.pathSize,
            cleanPathBorderTilesFromElements: elementsProvider.cleanPathBorderTilesFromElements,
            splitBordersInLayers: elementsProvider.splitBordersInLayers,
            splitBordersLayerSuffix: elementsProvider.splitBordersLayerSuffix,
            applyPathsInnerWalls: elementsProvider.applyPathsInnerWalls,
            pathsInnerWallsTilesKey: elementsProvider.pathsInnerWallsTilesKey,
            applyPathsOuterWalls: elementsProvider.applyPathsOuterWalls,
            pathsOuterWallsTilesKey: elementsProvider.pathsOuterWallsTilesKey,
            removeGroundLayer: elementsProvider.removeGroundLayer,
            applyGroundAsPathTilePostProcess: elementsProvider.applyGroundAsPathTilePostProcess
        };
    }

    static fromProvider(props, mapName, elementsProvider)
    {
        return Object.assign(
            sc.deepJsonClone(props),
            {
                mapName,
                mapFileName: mapName+'.json',
                tileSheetPath: MapDataMapper.buildTileSheetPath(props, elementsProvider),
                tileSheetName: mapName+'.png'
            },
            MapDataMapper.fromOptimizedMap(elementsProvider),
            MapDataMapper.fromElementsProvider(elementsProvider)
        );
    }

}

module.exports.MapDataMapper = MapDataMapper;
