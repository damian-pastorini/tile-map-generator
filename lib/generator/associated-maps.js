/**
 *
 * Reldens - Tile Map Generator - AssociatedMaps
 *
 */

const { FileHandler, sc } = require('@reldens/utils');

class AssociatedMaps
{

    static async generate(mapJson, mapFileName, rootFolder, associatedMapsConfig, randomMapGenerator)
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
            let generatorOptionsForAssociatedMap = sc.deepJsonClone(associatedMapsConfig);
            Object.assign(generatorOptionsForAssociatedMap, {tileMapJSON, mapFileName: subMapName, rootFolder});
            generators[subMapName] = await randomMapGenerator.fromAssociation(generatorOptionsForAssociatedMap);
            await generators[subMapName].generate();
        }
    }

}

module.exports.AssociatedMaps = AssociatedMaps;
