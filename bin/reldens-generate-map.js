#!/usr/bin/env node

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class ReldensGenerateMap
{

    constructor()
    {
        this.outputLogLevel = 100;
        this.examplesPath = FileHandler.joinPaths(FileHandler.getFolderName(__dirname), 'examples');
        this.examples = {
            'composite': 'layer-elements-composite/generate.js',
            'composite|with-loader': 'layer-elements-composite/generate-with-loader.js',
            'composite|dungeon|with-loader': 'layer-elements-composite/generate-with-loader-dungeon.js',
            'composite|multiple-with-names': 'layer-elements-composite/generate-multiples-with-names.js',
            'composite|multiple-with-names|with-loader':
                'layer-elements-composite/generate-with-loader-multiples-with-names.js',
            'composite|multiple-with-associations':
                'layer-elements-composite/generate-multiples-with-associations.js',
            'composite|multiple-with-associations|with-loader':
                'layer-elements-composite/generate-with-loader-multiples-with-associations.js',
            'object': 'layer-elements-object/generate.js',
            'object|with-loader': 'layer-elements-object/generate-with-loader.js'
        };
        this.knownFlags = Object.keys(this.examples).join('|').split('|');
        Logger.activeLogLevels = [this.outputLogLevel];
        Logger.setLogLevel(this.outputLogLevel);
        Logger.addTimeStamp = false;
    }

    async execute()
    {
        let example = sc.get(this.examples, this.fetchFlags().sort().join('|'), '');
        if('' === example){
            Logger.log(this.outputLogLevel, '', 'Usage: npm run reldens-generate-map -- [parameters]');
            this.showAvailableParameters();
            return false;
        }
        return await this.runExample(FileHandler.joinPaths(this.examplesPath, example));
    }

    async runExample(exampleFullPath)
    {
        let example = false;
        let executionResult = false;
        try {
            let exampleModule = require(exampleFullPath);
            example = new exampleModule[Object.keys(exampleModule).shift()]();
            await example.execute();
            executionResult = true;
        } catch(error) {
            Logger.log(this.outputLogLevel, '', 'Generation failed on '+exampleFullPath+' - '+error.message);
        }
        this.printGeneratedMaps(example);
        return executionResult;
    }

    fetchFlags()
    {
        let flags = [];
        let candidates = 2 < process.argv.length ? process.argv.slice(2) : Object.keys(process.env);
        for(let candidate of candidates){
            let flag = candidate.toLowerCase().replace('--', '').replace('npm_config_', '').split('_').join('-');
            if(!sc.inArray(flag, this.knownFlags)){
                continue;
            }
            if(sc.inArray(flag, flags)){
                continue;
            }
            flags.push(flag);
        }
        return flags;
    }

    printGeneratedMaps(example)
    {
        let mapsPaths = [];
        let associatedMaps = sc.get(example, 'associatedMaps', {});
        this.collectGenerators(sc.get(example, 'generators', {}), mapsPaths);
        for(let mapName of Object.keys(associatedMaps)){
            this.collectGenerators(associatedMaps[mapName].generators, mapsPaths);
        }
        if(0 === mapsPaths.length){
            Logger.log(this.outputLogLevel, '', 'No maps were generated.');
            return;
        }
        for(let mapPath of mapsPaths){
            Logger.log(this.outputLogLevel, '', 'Generated map: '+mapPath);
        }
    }

    collectGenerators(generators, mapsPaths)
    {
        if(!sc.isObject(generators)){
            return;
        }
        for(let mapName of Object.keys(generators)){
            if(!FileHandler.isFile(generators[mapName].mapFileFullPath)){
                continue;
            }
            mapsPaths.push(generators[mapName].mapFileFullPath);
        }
    }

    showAvailableParameters()
    {
        for(let flagsKey of Object.keys(this.examples)){
            Logger.log(this.outputLogLevel, '', '--'+flagsKey.split('|').join(' --')+' - '+this.examples[flagsKey]);
        }
    }

}

(new ReldensGenerateMap()).execute().then((executionResult) => {
    process.exit(executionResult ? 0 : 1);
});
