/**
 *
 * Reldens - Tile Map Generator - TileShortcutsMapper
 *
 */

const { TilesShortcuts } = require('./tiles-shortcuts');

class TileShortcutsMapper
{

    constructor(generator)
    {
        this.generator = generator;
    }

    mapTilesShortcuts(tilesKey, mainTile, propertiesMapper, suffix = '')
    {
        let tilesShortcuts = TilesShortcuts.fromPropertiesMappersList(
            tilesKey,
            mainTile,
            propertiesMapper,
            suffix,
            this.generator.groundSpotsPropertiesMappers,
            this.generator.optimizedMapFirstTileset
        );
        if(tilesShortcuts.pathTileReplacement){
            this.generator.pathTile = tilesShortcuts.pathTileReplacement;
        }
        return tilesShortcuts;
    }

}

module.exports.TileShortcutsMapper = TileShortcutsMapper;
