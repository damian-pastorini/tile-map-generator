/**
 *
 * Reldens - MainPathGeneratorBuilder
 *
 * Builds the MainPathGenerator the main path cases need, shared so it is written once. The generator is wired with
 * the real TilePositionCalculator, ReturnPointWriter, LayerDataFactory and MainPathMirror, and a grid builder stub
 * that records the marked positions and accepts every mark.
 *
 */

const { MainPathGenerator } = require('../lib/generator/main-path-generator');
const { MainPathMirror } = require('../lib/generator/main-path-mirror');
const { ReturnPointWriter } = require('../lib/generator/return-point-writer');
const { LayerDataFactory } = require('../lib/map/layer-data-factory');
const { TilePositionCalculator } = require('../lib/generator/tile-position-calculator');

class MainPathGeneratorBuilder
{

    static build(mapWidth, mapHeight, markedPositions)
    {
        let layerDataFactory = new LayerDataFactory();
        return new MainPathGenerator(
            new TilePositionCalculator({mapWidth, mapHeight}),
            new ReturnPointWriter(),
            layerDataFactory,
            {
                markMapGridPosition(mapGrid, y, x, walkable)
                {
                    if(markedPositions){
                        markedPositions.push({x, y, walkable});
                    }
                    return true;
                }
            },
            new MainPathMirror(layerDataFactory)
        );
    }

}

module.exports.MainPathGeneratorBuilder = MainPathGeneratorBuilder;
