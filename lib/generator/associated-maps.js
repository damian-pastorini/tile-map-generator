/**
 *
 * Reldens - Tile Map Generator - AssociatedMaps
 *
 */

const { RandomMapGenerator } = require('../../lib/random-map-generator');
const { FileHandler } = require('../../lib/files/file-handler');
const { Logger, sc } = require('@reldens/utils');

class AssociatedMaps
{

    constructor()
    {
        this.fileHandler = new FileHandler();
        this.generators = {};
        this.generatedSubMaps = {};
    }

    async generate(mapJson, mapName, rootFolder, associatedMapsConfig, mainMapGenerator)
    {
        if(!mapJson){
            Logger.critical('Missing map JSON for associated maps.', {mapJson, mapName});
            return false;
        }
        if(!mapName){
            Logger.critical('Missing map name for associated maps.', {mapJson, mapName});
            return false;
        }
        if(!associatedMapsConfig || 0 === Object.keys(associatedMapsConfig).length){
            Logger.critical('Missing associated maps config for associated maps.', {mapJson, mapName});
            return false;
        }
        if(associatedMapsConfig.dryRun){
            Logger.info('DRY-RUN on associated maps config.');
            return false;
        }
        let clonedChangePoints = sc.deepJsonClone(mainMapGenerator.generatedChangePoints);
        let generatedChangePoints = Object.keys(clonedChangePoints);
        if(0 === generatedChangePoints.length){
            return false;
        }
        for(let changePointKey of generatedChangePoints){
            let generatedChangePoint = clonedChangePoints[changePointKey];
            let changePointData = generatedChangePoint.elementData;
            let changePointLayer = mapJson.layers.filter(layer => {
                return layer.name === changePointData.name;
            }).shift();
            if(!changePointLayer){
                return false;
            }
            let mappedProperties = this.fetchPropertiesFromLayer(changePointLayer);
            if(!mappedProperties['compositeFileNames']){
                continue;
            }
            let tileMapJSON = this.loadTileMapJSON(rootFolder, mappedProperties);
            if(!tileMapJSON){
                continue;
            }
            let subMapName = this.generateSubMapName(
                changePointLayer,
                mappedProperties,
                mapName,
                generatedChangePoint
            );
            let mainMapFloorOptions = Object.assign(
                sc.deepJsonClone(mainMapGenerator.mappedMapDataFromProvider),
                sc.deepJsonClone(associatedMapsConfig),
                {tileMapJSON, mapName: subMapName, rootFolder},
                mappedProperties,
                {generatedChangePoints: {}, previousMainPath: [], mainPathSize: 0}
            );
            let downFloors = Number(mappedProperties['downFloors'] || 0);
            let upperFloors = Number(mappedProperties['upperFloors'] || 0);
            this.generators[subMapName] = new RandomMapGenerator();
            let subMapTitle = this.fetchSubMapTitle(mainMapGenerator, mappedProperties, generatedChangePoint);
            if('' !== subMapTitle){
                this.generators[subMapName].addMapProperty('mapTitle', 'string', subMapTitle);
            }
            await this.generators[subMapName].fromAssociation(mainMapFloorOptions);
            if(0 < downFloors){
                this.generators[subMapName].elementsQuantity['stairs-down'] = 1;
            }
            if(0 < upperFloors){
                this.generators[subMapName].elementsQuantity['stairs-up'] = 1;
            }
            if(mappedProperties['entryPosition']){
                this.generators[subMapName].entryPosition = mappedProperties['entryPosition'];
                this.generators[subMapName].entryPositionSize = mappedProperties['entryPositionSize'];
                this.generators[subMapName].entryPositionFrom = mapName;
            }
            this.generatedSubMaps[subMapName] = await this.generators[subMapName].generate();
            mainMapFloorOptions.entryPosition = '';
            mainMapFloorOptions.entryPositionFrom = '';
            mainMapFloorOptions.entryPositionSize = 0;
            if('' !== subMapTitle){
                mainMapFloorOptions.mapTitle = subMapTitle;
            }
            if(0 < downFloors){
                let floorKeyDown = 'down';
                this.generators[subMapName].generatedFloorData.floorKey = floorKeyDown;
                await this.generateFloors(
                    downFloors,
                    floorKeyDown,
                    subMapName,
                    mainMapFloorOptions,
                    downFloors,
                    this.generators[subMapName].generatedFloorData
                );
            }
            if(0 < upperFloors){
                let floorKeyUpper = 'upper';
                this.generators[subMapName].generatedFloorData.floorKey = floorKeyUpper;
                await this.generateFloors(
                    upperFloors,
                    floorKeyUpper,
                    subMapName,
                    mainMapFloorOptions,
                    upperFloors,
                    this.generators[subMapName].generatedFloorData
                );
            }
        }
        return this.generatedSubMaps;
    }

    fetchSubMapTitle(mainMapGenerator, mappedProperties, changePointData)
    {
        // @TODO - BETA - Make all the titles configurable.
        let mapTitle = (mainMapGenerator.fetchMapProperty('mapTitle')?.value || '').toString();
        let elementTitle = mappedProperties['elementTitle'] || '';
        let elementNumber = sc.get(changePointData, 'elementNumber', '');
        let fetchedTitle = '';
        if('' !== mapTitle){
            fetchedTitle = mapTitle;
        }
        if('' !== elementTitle){
            fetchedTitle = fetchedTitle + ('' !== fetchedTitle ? ' - ' : '') + elementTitle;
        }
        if('' !== elementNumber){
            fetchedTitle = fetchedTitle + ('' !== fetchedTitle ? '-' : '') + elementNumber;
        }
        return fetchedTitle;
    }

    async generateFloors(
        floorNumber,
        floorKey,
        subMapName,
        previousMapFloorOptions,
        totalFloorsByKey,
        previousFloorData
    ){
        if(0 === floorNumber){
            return;
        }
        let floorName = subMapName + '-'+floorKey+'Floor-n' + floorNumber;
        let mapFloorOptions = sc.deepJsonClone(previousMapFloorOptions);
        mapFloorOptions['mapName'] = floorName;
        mapFloorOptions['mainPathSize'] = 0;
        this.generators[floorName] = new RandomMapGenerator();
        this.generators[floorName].addMapProperty('currentFloor', 'int', floorNumber);
        this.generators[floorName].addMapProperty('floorKey', 'string', floorKey);
        let previousMapTitle = (previousMapFloorOptions.mapTitle || '').toString();
        if('' !== previousMapTitle){
            let floorTitle = (floorKey === 'down' ? 'Down ' : 'Upper ') + 'Floor ' + floorNumber;
            this.generators[floorName].addMapProperty('mapTitle', 'string', previousMapTitle + ' - ' + floorTitle);
        }
        await this.generators[floorName].fromAssociation(mapFloorOptions);
        if('upper' === floorKey){
            this.generators[floorName].elementsQuantity['stairs-down'] = 1;
            this.generators[floorName].elementsQuantity['stairs-up'] = totalFloorsByKey === floorNumber ? 0 : 1;
        }
        if('down' === floorKey){
            this.generators[floorName].elementsQuantity['stairs-down'] = totalFloorsByKey === floorNumber ? 0 : 1;
            this.generators[floorName].elementsQuantity['stairs-up'] = 1;
        }
        this.generators[floorName].previousFloorData = previousFloorData;
        this.generators[floorName].generatedFloorData['floorKey'] = floorKey;
        this.generatedSubMaps[floorName] = await this.generators[floorName].generate();
        await this.generateFloors(
            floorNumber - 1,
            floorKey,
            subMapName,
            mapFloorOptions,
            totalFloorsByKey,
            this.generatedSubMaps[floorName].generatedFloorData
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

    generateSubMapName(layer, mappedProperties, mapName, changePointData)
    {
        let nameFromLayer = layer.name.split('-');
        let foundSubName = mappedProperties['subMapName'] || nameFromLayer[0] + '-' + nameFromLayer[1];
        return mapName+'-'+foundSubName+'-n'+sc.get(changePointData, 'elementNumber', 'n');
    }

    fetchPropertiesFromLayer(layer)
    {
        if(!layer.properties){
            return {};
        }
        let mappedProperties = {};
        for(let property of layer.properties){
            mappedProperties[property.name] = property.value;
        }
        return mappedProperties;
    }
}

module.exports.AssociatedMaps = AssociatedMaps;
