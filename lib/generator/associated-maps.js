/**
 *
 * Reldens - Tile Map Generator - AssociatedMaps
 *
 */

const { Logger, sc } = require('@reldens/utils');

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
        let generators = {};
        let generatedSubMaps = {};
        for (let layer of changePointLayers) {
            let mappedProperties = this.fetchPropertiesFromLayer(layer);
            if (!mappedProperties['compositeFileName']) {
                continue;
            }
            let tileMapJSON = this.loadTileMapJSON(randomMapGenerator.fileHandler, rootFolder, mappedProperties);
            if (!tileMapJSON) {
                continue;
            }
            let subMapName = this.generateSubMapName(layer, mappedProperties, mapFileName);
            let generatorOptionsForAssociatedMap = sc.deepJsonClone(associatedMapsConfig);
            Object.assign(generatorOptionsForAssociatedMap, {tileMapJSON, mapFileName: subMapName, rootFolder});
            generators[subMapName] = await randomMapGenerator.fromAssociation(generatorOptionsForAssociatedMap);
            generatedSubMaps[subMapName] = await generators[subMapName].generate();
        }
        return generatedSubMaps;
    }

    static loadTileMapJSON(fileHandler, rootFolder, mappedProperties)
    {
        let associatedCompositeFilePath = fileHandler.joinPaths(
            rootFolder,
            mappedProperties['compositeFileName'] + '.json'
        );
        try {
            let fileContents = fileHandler.readFile(associatedCompositeFilePath);
            return sc.parseJson(fileContents);
        } catch (error) {
            Logger.critical('Composite map file for associated map could not be loaded.', associatedCompositeFilePath);
        }
        return false;
    }

    static generateSubMapName(layer, mappedProperties, mapFileName)
    {
        let nameFromLayer = layer.name.split('-');
        let foundSubName = mappedProperties['subMapName'] || nameFromLayer[0] + '-' + nameFromLayer[1];
        return mapFileName.replace('.json', '') + '-' + foundSubName;
    }

    static fetchPropertiesFromLayer(layer)
    {
        let mappedProperties = {};
        for (let property of layer.properties) {
            mappedProperties[property.name] = property.value;
        }
        return mappedProperties;
    }
}

module.exports.AssociatedMaps = AssociatedMaps;
