/**
 *
 * Reldens - Tile Map Generator - TilePositionCalculator
 *
 */

class TilePositionCalculator
{

    constructor(generator)
    {
        this.generator = generator;
    }

    provideReturnIndexByPosition(x, y, elementData)
    {
        x = this.fetchNonBorderValue(x, this.generator.mapWidth);
        y = this.fetchNonBorderValue(y, this.generator.mapHeight);
        if(elementData?.position){
            return this.tileIndexByRowAndColumn(elementData.position.y + y, elementData.position.x + x);
        }
        return this.tileIndexByRowAndColumn(y, x);
    }

    fetchNonBorderValue(value, dimension)
    {
        if(0 === value){
            return 1;
        }
        if(dimension - 1 === value){
            return dimension - 2;
        }
        return value;
    }

    tileIndexByRowAndColumn(row, column)
    {
        return row * this.generator.mapWidth + column;
    }

    isBorder(pathTilePosition)
    {
        return 0 >= pathTilePosition.x
            || 0 >= pathTilePosition.y
            || this.generator.mapWidth === pathTilePosition.x
            || this.generator.mapHeight === pathTilePosition.y;
    }

}

module.exports.TilePositionCalculator = TilePositionCalculator;
