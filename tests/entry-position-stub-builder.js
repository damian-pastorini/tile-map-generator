/**
 *
 * Reldens - EntryPositionStubBuilder
 *
 * The minimal generator stub the entry position cases need, shared so it is written once. It carries the pieces
 * MapBorderGenerator.createEntryPosition() and redrawBorderForGrownMap() touch: the map size, the border layer,
 * the grid, the additional layers the change points layer is pushed into, and the return point writer.
 *
 */

const { MapGridBuilder } = require('../lib/generator/map-grid-builder');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');

class EntryPositionStubBuilder
{

    static build(overrides)
    {
        let generator = {
            mapWidth: 10,
            mapHeight: 8,
            blockMapBorder: false,
            groundTile: 116,
            bordersTiles: {},
            borderInnerCornersTiles: {},
            entryPositionSize: 2,
            entryPositionFrom: '',
            borderLayer: Array(80).fill(116),
            additionalLayers: [],
            generatedChangePoints: {},
            generatedReturnPoints: {},
            returnPointWriter: new ReturnPointWriter(),
            mapGrid: Array.from({length: 8}, () => Array(10).fill(true)),
            generateLayerWithData: (name, data) => {
                return {name, data};
            }
        };
        Object.assign(generator, overrides);
        generator.mapGridBuilder = new MapGridBuilder(generator);
        return generator;
    }

}

module.exports.EntryPositionStubBuilder = EntryPositionStubBuilder;
