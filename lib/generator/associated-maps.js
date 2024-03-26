/**
 *
 * Reldens - Tile Map Generator - AssociatedMaps
 *
 */

const { FileHandler, sc } = require('@reldens/utils');

class AssociatedMaps
{
    static async generate(mapJson, mapFileName, rootFolder, randomMapGenerator)
    {
        let changePointLayers = mapJson.layers.filter(layer => {
            return -1 !== layer.name.indexOf('change-points');
        });
        if (0 === changePointLayers.length) {
            return false;
        }
        let fileHandler = new FileHandler();
        let generators = {};
        for (let layer of changePointLayers) {
            let mappedProperties = {};
            for (let property of layer.properties) {
                mappedProperties[property.name] = property.value;
            }
            if (!mappedProperties['compositeFileName']) {
                continue;
            }
            let nameFromLayer = layer.name.split('-');
            let foundSubName = mappedProperties['subMapName'] || nameFromLayer[0] + '-' + nameFromLayer[1];
            let subMapName = mapFileName.replace('.json', '')+'-'+ foundSubName;
            let associatedCompositeFilePath = fileHandler.joinPaths(
                rootFolder,
                mappedProperties['compositeFileName']+'.json'
            );
            let fileContents = fileHandler.readFile(associatedCompositeFilePath);
            let tileMapJSON = sc.parseJson(fileContents);
            generators[subMapName] = await randomMapGenerator.fromAssociation({
                tileMapJSON,
                mapFileName: subMapName,
                rootFolder,
                generateElementsPath: false,
                blockMapBorder: true,
                freeSpaceTilesQuantity: 2,
                variableTilesPercentage: 15,
                collisionLayersForPaths: ['change-points', 'collisions']
            });
            await generators[subMapName].generate();
        }
    }
}

module.exports.AssociatedMaps = AssociatedMaps;
