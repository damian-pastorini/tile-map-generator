/**
 *
 * Reldens - Element Fixtures
 *
 */

class ElementFixtures
{

    static buildMap(layers, width, height)
    {
        return {
            width: width ? width : 4,
            height: height ? height : 4,
            tilewidth: 32,
            tileheight: 32,
            layers
        };
    }

    static buildLayer(name, data)
    {
        return {type: 'tilelayer', name, data};
    }

    static gridWithTileAt(col, row, gid, width, height)
    {
        let w = width ? width : 4;
        let data = new Array(w * (height ? height : 4)).fill(0);
        data[row * w + col] = gid;
        return data;
    }

    static buildElement(instanceId, elementKey, index, bounds, layers)
    {
        return {instanceId, elementKey, index, bounds, layers};
    }

    static buildElementLayer(name, type, tiles)
    {
        return {name, type, tiles};
    }

    static buildSingleTileTreeMap()
    {
        return ElementFixtures.buildMap([
            ElementFixtures.buildLayer('tree-001-below-player', ElementFixtures.gridWithTileAt(1, 1, 100))
        ]);
    }

    static buildSingleTileTreeElements()
    {
        return {
            elements: [ElementFixtures.buildElement('tree-001', 'tree', 1,
                {col: 1, row: 1, width: 1, height: 1},
                [ElementFixtures.buildElementLayer('tree-001-below-player', 'below-player', [{col: 1, row: 1, gid: 100}])]
            )]
        };
    }
}

module.exports.ElementFixtures = ElementFixtures;
