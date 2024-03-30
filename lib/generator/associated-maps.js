/**
 *
 * Reldens - Tile Map Generator - AssociatedMaps
 *
 */

const { RandomMapGenerator } = require('../../lib/random-map-generator');
const { FileHandler, Logger, sc } = require('@reldens/utils');

class AssociatedMaps
{

    constructor()
    {
        this.fileHandler = new FileHandler();
    }

    async generate(mapJson, mapFileName, rootFolder, associatedMapsConfig, mainMapGenerator)
    {
        let clonedChangePoints = sc.deepJsonClone(mainMapGenerator.generatedChangePoints);
        let generatedChangePoints = Object.keys(clonedChangePoints);
        if (0 === generatedChangePoints.length){
            return false;
        }
        let generators = {};
        let generatedSubMaps = {};
        for (let changePointKey of generatedChangePoints) {
            let generatedChangePoint = clonedChangePoints[changePointKey];
            let changePointData = generatedChangePoint.elementData;
            let changePointLayer = mapJson.layers.filter(layer => {
                return layer.name === changePointData.name;
            }).shift();
            if (!changePointLayer) {
                return false;
            }
            let mappedProperties = this.fetchPropertiesFromLayer(changePointLayer);
            if (!mappedProperties['compositeFileNames']) {
                continue;
            }
            let tileMapJSON = this.loadTileMapJSON(rootFolder, mappedProperties);
            if (!tileMapJSON) {
                continue;
            }
            let subMapName = this.generateSubMapName(
                changePointLayer,
                mappedProperties,
                mapFileName,
                generatedChangePoint
            );
            let generatorOptionsForAssociatedMap = Object.assign(
                sc.deepJsonClone(mainMapGenerator.mappedMapDataFromProvider),
                sc.deepJsonClone(associatedMapsConfig),
                {tileMapJSON, mapFileName: subMapName, rootFolder},
                mappedProperties,
                {generatedChangePoints: {}, previousMainPath: [], mainPathSize: 0}
            );
            let downFloors = Number(mappedProperties['downFloors'] || 0);
            let upperFloors = Number(mappedProperties['upperFloors'] || 0);
            generators[subMapName] = new RandomMapGenerator();
            await generators[subMapName].fromAssociation(generatorOptionsForAssociatedMap);
            if (0 < downFloors) {
                generators[subMapName].elementsQuantity['stairs-down'] = 1;
            }
            if (0 < upperFloors) {
                generators[subMapName].elementsQuantity['stairs-up'] = 1;
            }
            generatedSubMaps[subMapName] = await generators[subMapName].generate();
            if (0 < downFloors) {
                await this.generateFloors(
                    downFloors,
                    'down',
                    mappedProperties,
                    subMapName,
                    generatorOptionsForAssociatedMap,
                    generators,
                    generators[subMapName],
                    generatedSubMaps,
                    downFloors
                );
            }
            if (0 < upperFloors) {
                await this.generateFloors(
                    upperFloors,
                    'upper',
                    mappedProperties,
                    subMapName,
                    generatorOptionsForAssociatedMap,
                    generators,
                    generators[subMapName],
                    generatedSubMaps,
                    upperFloors
                );
            }
        }
        return generatedSubMaps;
    }

    async generateFloors(
        floorNumber,
        floorKey,
        mappedProperties,
        subMapName,
        generatorOptionsForFloorMap,
        generators,
        generatedSubMaps,
        totalFloorsByKey
    ) {
        if (0 === floorNumber) {
            return;
        }
        let floorName = subMapName + '-'+floorKey+'Floor-' + floorNumber;
        let mapFloorOptions = sc.deepJsonClone(generatorOptionsForFloorMap);
        mapFloorOptions['mapFileName'] = floorName;
        mapFloorOptions['mainPathSize'] = 0;
        generators[floorName] = new RandomMapGenerator();
        await generators[floorName].fromAssociation(mapFloorOptions);
        if ('upper' === floorKey) {
            generators[floorName].elementsQuantity['stairs-down'] = 1;
            generators[floorName].elementsQuantity['stairs-up'] = totalFloorsByKey === floorNumber ? 0 : 1;
        }
        if ('down' === floorKey) {
            generators[floorName].elementsQuantity['stairs-down'] = totalFloorsByKey === floorNumber ? 0 : 1;
            generators[floorName].elementsQuantity['stairs-up'] = 1;
        }
        generatedSubMaps[floorName] = await generators[floorName].generate();
        await this.generateFloors(
            floorNumber - 1,
            floorKey,
            mappedProperties,
            subMapName,
            mapFloorOptions,
            generators,
            generatedSubMaps,
            totalFloorsByKey
        );
    }

    loadTileMapJSON(rootFolder, mappedProperties)
    {
        let compositeFileName = sc.randomValueFromArray(mappedProperties['compositeFileNames'].split(','));
        let associatedCompositeFilePath = this.fileHandler.joinPaths(
            rootFolder,
            compositeFileName + '.json'
        );
        try {
            let fileContents = this.fileHandler.readFile(associatedCompositeFilePath);
            return sc.parseJson(fileContents);
        } catch (error) {
            Logger.critical('Composite map file for associated map could not be loaded.', associatedCompositeFilePath);
        }
        return false;
    }

    generateSubMapName(layer, mappedProperties, mapFileName, changePointData)
    {
        let nameFromLayer = layer.name.split('-');
        let foundSubName = mappedProperties['subMapName'] || nameFromLayer[0] + '-' + nameFromLayer[1];
        return mapFileName.replace('.json', '')+'-'+foundSubName+'-n'+sc.get(changePointData, 'elementNumber', 'n');
    }

    fetchPropertiesFromLayer(layer)
    {
        if (!layer.properties) {
            return {};
        }
        let mappedProperties = {};
        for (let property of layer.properties) {
            mappedProperties[property.name] = property.value;
        }
        return mappedProperties;
    }
}

module.exports.AssociatedMaps = AssociatedMaps;
