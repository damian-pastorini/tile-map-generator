/**
 *
 * Reldens - Tile Map Generator - GeneratorClassesValidator
 *
 */

const { OptionsValidator } = require('../validator/options-validator');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class GeneratorClassesValidator extends OptionsValidator
{

    constructor()
    {
        super();
        this.validationResults = [];
        this.validationErrors = [];
    }

    validateAllGeneratorClasses(testDataPath)
    {
        let objectLoaderValidation = this.validateLayerElementsObjectLoader(testDataPath);
        let compositeLoaderValidation = this.validateLayerElementsCompositeLoader(testDataPath);
        let multipleByLoaderValidation = this.validateMultipleByLoaderGenerator(testDataPath, 2);
        let associationsValidation = this.validateMultipleWithAssociationsByLoaderGenerator(testDataPath);
        return {
            isValid: objectLoaderValidation.isValid
                && compositeLoaderValidation.isValid
                && multipleByLoaderValidation.isValid
                && associationsValidation.isValid,
            objectLoaderValidation,
            compositeLoaderValidation,
            multipleByLoaderValidation,
            associationsValidation
        };
    }

    createValidationResult(extraFlags)
    {
        return Object.assign({isValid: true}, extraFlags, {errorHandling: true, violations: []});
    }

    handleValidationError(validation, contextMessage, error)
    {
        validation.errorHandling = false;
        validation.violations.push(contextMessage+error.message);
        validation.isValid = false;
        return validation;
    }

    validateLayerElementsObjectLoader(testDataPath)
    {
        let validation = this.createValidationResult({
            fileProcessing: true,
            configurationParsing: true,
            mapGeneration: true
        });
        try {
            let housePath = FileHandler.joinPaths(testDataPath, 'house-001.json');
            let treePath = FileHandler.joinPaths(testDataPath, 'tree.json');
            if(!FileHandler.exists(housePath)){
                validation.fileProcessing = false;
                validation.violations.push('Test file not found: house-001.json');
                validation.isValid = false;
            }
            if(!FileHandler.exists(treePath)){
                validation.fileProcessing = false;
                validation.violations.push('Test file not found: tree.json');
                validation.isValid = false;
            }
            if(validation.fileProcessing){
                let houseData = JSON.parse(FileHandler.readFile(housePath));
                let treeData = JSON.parse(FileHandler.readFile(treePath));
                if(!this.validateJsonStructure(houseData, 'house')){
                    validation.configurationParsing = false;
                    validation.violations.push('Invalid house JSON structure');
                    validation.isValid = false;
                }
                if(!this.validateJsonStructure(treeData, 'tree')){
                    validation.configurationParsing = false;
                    validation.violations.push('Invalid tree JSON structure');
                    validation.isValid = false;
                }
            }
        } catch(error){
            return this.handleValidationError(validation, 'Error in object loader validation: ', error);
        }
        return validation;
    }

    validateLayerElementsCompositeLoader(testDataPath)
    {
        let validation = this.createValidationResult({
            fileProcessing: true,
            compositeStructure: true,
            elementExtraction: true
        });
        try {
            let compositePath = FileHandler.joinPaths(testDataPath, 'reldens-town-composite.json');
            if(!FileHandler.exists(compositePath)){
                validation.fileProcessing = false;
                validation.violations.push('Composite file not found: reldens-town-composite.json');
                validation.isValid = false;
                return validation;
            }
            let compositeData = JSON.parse(FileHandler.readFile(compositePath));
            if(!this.validateCompositeStructure(compositeData)){
                validation.compositeStructure = false;
                validation.violations.push('Invalid composite structure');
                validation.isValid = false;
            }
            let extractedElements = this.extractElementsFromComposite(compositeData);
            if(0 === extractedElements.length){
                validation.elementExtraction = false;
                validation.violations.push('No elements extracted from composite');
                validation.isValid = false;
            }
        } catch(error){
            return this.handleValidationError(validation, 'Error in composite loader validation: ', error);
        }
        return validation;
    }

    validateMultipleByLoaderGenerator(testDataPath, minimumFiles)
    {
        if(undefined === minimumFiles){
            return {isValid: false, reason: 'minimumFiles parameter is required'};
        }
        let validation = this.createValidationResult({
            multipleFileHandling: true,
            batchProcessing: true,
            configurationManagement: true
        });
        try {
            let files = ['house-001.json', 'house-002.json', 'tree.json'];
            let existingFiles = [];
            for(let fileName of files){
                let filePath = FileHandler.joinPaths(testDataPath, fileName);
                if(FileHandler.exists(filePath)){
                    existingFiles.push(filePath);
                }
            }
            if(minimumFiles > existingFiles.length){
                validation.multipleFileHandling = false;
                validation.violations.push('Insufficient files for multiple loader test');
                validation.isValid = false;
            }
            if(validation.multipleFileHandling){
                let batchConfig = this.createBatchConfiguration(existingFiles);
                if(!this.validateBatchConfiguration(batchConfig)){
                    validation.batchProcessing = false;
                    validation.violations.push('Invalid batch configuration');
                    validation.isValid = false;
                }
            }
        } catch(error){
            return this.handleValidationError(validation, 'Error in multiple loader validation: ', error);
        }
        return validation;
    }

    validateMultipleWithAssociationsByLoaderGenerator(testDataPath)
    {
        let validation = this.createValidationResult({
            associationHandling: true,
            workflowConsistency: true,
            configurationManagement: true
        });
        try {
            let mockAssociations = this.createMockAssociations(testDataPath);
            if(!this.validateAssociationsStructure(mockAssociations)){
                validation.associationHandling = false;
                validation.violations.push('Invalid associations structure');
                validation.isValid = false;
            }
            let workflowResult = this.simulateAssociationsWorkflow(mockAssociations);
            if(!workflowResult.isValid){
                validation.workflowConsistency = false;
                validation.violations.push('Associations workflow failed');
                validation.isValid = false;
            }
        } catch(error){
            return this.handleValidationError(validation, 'Error in associations validation: ', error);
        }
        return validation;
    }

    requireNonEmptyArray(value)
    {
        if(!sc.isArray(value)){
            return false;
        }
        if(0 === value.length){
            return false;
        }
        return true;
    }

    validateJsonStructure(jsonData, elementType)
    {
        if(!sc.isObject(jsonData)){
            return false;
        }
        let layers = sc.get(jsonData, 'layers', []);
        if(!this.requireNonEmptyArray(layers)){
            return false;
        }
        let hasTileLayer = layers.some(layer => 'tilelayer' === sc.get(layer, 'type'));
        if(!hasTileLayer){
            return false;
        }
        return true;
    }

    validateCompositeStructure(compositeData)
    {
        if(!sc.isObject(compositeData)){
            return false;
        }
        let layers = sc.get(compositeData, 'layers', []);
        let tilesets = sc.get(compositeData, 'tilesets', []);
        if(!this.requireNonEmptyArray(layers)){
            return false;
        }
        if(!this.requireNonEmptyArray(tilesets)){
            return false;
        }
        return true;
    }

    extractElementsFromComposite(compositeData)
    {
        let layers = sc.get(compositeData, 'layers', []);
        let extractedElements = [];
        for(let layer of layers){
            let layerType = sc.get(layer, 'type');
            let layerName = sc.get(layer, 'name', '');
            if('tilelayer' === layerType && '' !== layerName){
                extractedElements.push({
                    name: layerName,
                    type: layerType,
                    width: sc.get(layer, 'width', 0),
                    height: sc.get(layer, 'height', 0),
                    data: sc.get(layer, 'data', [])
                });
            }
        }
        return extractedElements;
    }

    createBatchConfiguration(filePaths)
    {
        let batchConfig = {
            files: [],
            elementsQuantity: {},
            rootFolder: ''
        };
        for(let filePath of filePaths){
            let fileName = FileHandler.getFileName(filePath);
            let elementKey = fileName.replace('.json', '');
            batchConfig.files.push(filePath);
            batchConfig.elementsQuantity[elementKey] = 1;
        }
        return batchConfig;
    }

    validateBatchConfiguration(batchConfig)
    {
        if(!sc.isObject(batchConfig)){
            return false;
        }
        let files = sc.get(batchConfig, 'files', []);
        let elementsQuantity = sc.get(batchConfig, 'elementsQuantity', {});
        if(!this.requireNonEmptyArray(files)){
            return false;
        }
        if(!sc.isObject(elementsQuantity)){
            return false;
        }
        if(0 === Object.keys(elementsQuantity).length){
            return false;
        }
        return true;
    }

    createMockAssociations(testDataPath)
    {
        return {
            mainMap: {
                name: 'main-map',
                elements: ['house-001', 'tree'],
                path: testDataPath
            },
            associatedMaps: [
                {
                    name: 'house-interior',
                    parentElement: 'house-001',
                    connection: 'door',
                    path: testDataPath
                }
            ]
        };
    }

    validateAssociationsStructure(associations)
    {
        if(!sc.isObject(associations)){
            return false;
        }
        let mainMap = sc.get(associations, 'mainMap');
        let associatedMaps = sc.get(associations, 'associatedMaps', []);
        if(!sc.isObject(mainMap)){
            return false;
        }
        if(!sc.isArray(associatedMaps)){
            return false;
        }
        for(let associatedMap of associatedMaps){
            if(!sc.isObject(associatedMap)){
                return false;
            }
            let parentElement = sc.get(associatedMap, 'parentElement');
            if(!parentElement){
                return false;
            }
        }
        return true;
    }

    simulateAssociationsWorkflow(associations)
    {
        let validation = {
            isValid: true,
            mainMapProcessed: false,
            associatedMapsProcessed: 0,
            connectionsEstablished: 0,
            violations: []
        };
        let mainMap = sc.get(associations, 'mainMap');
        if(sc.isObject(mainMap)){
            validation.mainMapProcessed = true;
        }
        let associatedMaps = sc.get(associations, 'associatedMaps', []);
        for(let associatedMap of associatedMaps){
            validation.associatedMapsProcessed++;
            let connection = sc.get(associatedMap, 'connection');
            if(connection){
                validation.connectionsEstablished++;
            }
        }
        if(!validation.mainMapProcessed){
            validation.violations.push('Main map not processed');
            validation.isValid = false;
        }
        if(0 === validation.associatedMapsProcessed){
            validation.violations.push('No associated maps processed');
            validation.isValid = false;
        }
        return validation;
    }

}

module.exports.GeneratorClassesValidator = GeneratorClassesValidator;
