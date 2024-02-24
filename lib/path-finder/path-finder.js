/**
 *
 * Reldens - Tile Map Generator - PathFinder
 *
 */

const { Grid, AStarFinder } = require('pathfinding');

class PathFinder
{

    create(width, height)
    {
        return new Grid(width, height);
    }

    findPath(start, end, mapWidth, mapHeight, grid)
    {
        let finder = new AStarFinder();
        let gridClone = grid.clone();
        return finder.findPath(start.x, start.y, end.x, end.y, gridClone);
    }

}

module.exports.PathFinder = PathFinder;
