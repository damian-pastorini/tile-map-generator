/**
 *
 * Reldens - Test Multiple With Associations By Loader Generator
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { MultipleWithAssociationsByLoaderGenerator } = require('../lib/generator/multiple-with-associations-by-loader-generator');
const { RandomMapGenerator } = require('../lib/random-map-generator');
const { AssociatedMaps } = require('../lib/generator/associated-maps');
const { FileHandler } = require('@reldens/server-utils');

class TestMultipleWithAssociationsByLoaderGenerator extends BaseMapGeneratorTest
{

    async generateThreeMaps(namePrefix, chainMainPaths, seed)
    {
        let examplesFolder = FileHandler.joinPaths(this.testDataFolder, '..', '..', 'examples', 'layer-elements-composite');
        let mapData = FileHandler.fetchFileJson(FileHandler.joinPaths(examplesFolder, 'map-composite-data-with-names.json'));
        mapData.factor = 1;
        mapData.chainMainPaths = chainMainPaths;
        mapData.associationsProperties = {dryRun: true};
        mapData.mapsInformation = [1, 2, 3].map(mapNumber => {
            return {mapName: namePrefix+'-00'+mapNumber, mapTitle: 'Map '+mapNumber};
        });
        let generator = new MultipleWithAssociationsByLoaderGenerator({
            loaderData: {
                rootFolder: examplesFolder,
                generatedFolder: FileHandler.joinPaths(this.testDataFolder, 'generated-'+namePrefix),
                mapData
            }
        });
        Math.random = this.seedRandom(seed);
        try {
            await generator.generate();
        } finally {
            this.restoreMathRandom();
        }
        return generator;
    }

    fetchLinkPropertyNames(map)
    {
        let linksLayer = map.layers.find(layer => 'main-path-links-change-points' === layer.name);
        this.assert(linksLayer, 'The generated map must contain the main path links layer');
        return [...new Set(linksLayer.properties.map(property => property.name))].sort();
    }

    buildLinkPropertyNames(targetMapName, isDefault)
    {
        let names = [
            'change-point-for-'+targetMapName,
            'return-point-for-'+targetMapName,
            'return-point-position-'+targetMapName,
            'return-point-x-'+targetMapName,
            'return-point-y-'+targetMapName
        ];
        if(isDefault){
            names.push('return-point-isDefault-'+targetMapName);
        }
        return names.sort();
    }

    async testPairModeMirrorsThePreviousMapMainPath()
    {
        await this.test('the second map receives the first map main path mirrored and the third starts a new pair', async () => {
            let generator = await this.generateThreeMaps('pair-map', false, 24680);
            let firstMap = generator.generators['pair-map-001'];
            let secondMap = generator.generators['pair-map-002'];
            let thirdMap = generator.generators['pair-map-003'];
            this.assertDeepEqual(
                secondMap.previousMainPath,
                firstMap.generatedMainPathIndexes,
                'The previous generator must be found by map name and hand over its main path'
            );
            this.assert(secondMap.hasAssociatedMap, 'The second map consumed the previous main path');
            this.assertEqual(
                secondMap.mainPathEdge,
                secondMap.mainPathMirror.oppositeEdges[firstMap.mainPathEdge],
                'The mirrored main path must be on the opposite edge'
            );
            this.assertDeepEqual(thirdMap.previousMainPath, [], 'A map after a consumed path starts a new pair');
        });
    }

    async testChainModeLinksEveryMapToThePreviousAndNextMaps()
    {
        await this.test('chainMainPaths gives every map an entry and an exit linked to its neighbours', async () => {
            let generator = await this.generateThreeMaps('chain-map', true, 13579);
            let firstMap = generator.generators['chain-map-001'];
            let secondMap = generator.generators['chain-map-002'];
            let thirdMap = generator.generators['chain-map-003'];
            this.assertDeepEqual(
                [firstMap.previousMapName, firstMap.nextMapName, secondMap.previousMapName, secondMap.nextMapName],
                ['', 'chain-map-002', 'chain-map-001', 'chain-map-003'],
                'Each map knows its neighbours'
            );
            this.assertDeepEqual([thirdMap.previousMapName, thirdMap.nextMapName], ['chain-map-002', ''], 'Last map');
            this.assertDeepEqual(
                firstMap.generatedExitMainPathIndexes,
                firstMap.generatedMainPathIndexes,
                'The first map main path is its exit'
            );
            this.assertDeepEqual(secondMap.previousMainPath, firstMap.generatedExitMainPathIndexes, 'Second entry');
            this.assertDeepEqual(thirdMap.previousMainPath, secondMap.generatedExitMainPathIndexes, 'Third entry');
            this.assertEqual(secondMap.generatedExitMainPathIndexes.length, 3, 'The second map has its own exit');
            this.assert(secondMap.exitMainPathEdge !== secondMap.mainPathEdge, 'Entry and exit use different edges');
            this.assertDeepEqual(
                this.fetchLinkPropertyNames(generator.generatedMaps['chain-map-001']),
                this.buildLinkPropertyNames('chain-map-002', true),
                'The first map links only to the next map, its exit arrival is the default return point'
            );
            this.assertDeepEqual(
                this.fetchLinkPropertyNames(generator.generatedMaps['chain-map-002']),
                [
                    ...this.buildLinkPropertyNames('chain-map-001', true),
                    ...this.buildLinkPropertyNames('chain-map-003', false)
                ].sort(),
                'The middle map links to both neighbours, the entry arrival is the default return point'
            );
            this.assertDeepEqual(
                this.fetchLinkPropertyNames(generator.generatedMaps['chain-map-003']),
                this.buildLinkPropertyNames('chain-map-002', true),
                'The last map links only to the previous map'
            );
        });
    }

    async testChainModeOpensTheBorderWithoutSelfReturnPoints()
    {
        await this.test('chained openings are cut in the border and no self referencing default is written', async () => {
            let generator = await this.generateThreeMaps('chain-open-map', true, 97531);
            let secondMapName = 'chain-open-map-002';
            let secondMap = generator.generatedMaps[secondMapName];
            let allPropertyNames = Object.keys(generator.generatedMaps).flatMap(mapName => {
                return generator.generatedMaps[mapName].layers.flatMap(layer => {
                    return (layer.properties || []).map(property => property.name);
                });
            });
            let selfReturnPoints = allPropertyNames.filter(name => 0 === name.indexOf('return-point-for-default-'));
            this.assertDeepEqual(selfReturnPoints, [], 'Chained maps must not write the default main path return point');
            let linksLayer = secondMap.layers.find(layer => 'main-path-links-change-points' === layer.name);
            let borderLayer = secondMap.layers.find(layer => 'collisions-map-border' === layer.name);
            let changePointIndexes = linksLayer.properties
                .filter(property => 0 === property.name.indexOf('change-point-for-'))
                .map(property => property.value);
            this.assertEqual(changePointIndexes.length, 6, 'Three entry and three exit change points');
            this.assertDeepEqual(
                changePointIndexes.map(index => borderLayer.data[index]),
                [0, 0, 0, 0, 0, 0],
                'Every change point cell must be cut out of the collisions map border'
            );
            let borderColumns = [0, secondMap.width - 1];
            let borderRows = [0, secondMap.height - 1];
            let offBorderIndexes = changePointIndexes.filter(index => {
                return -1 === borderColumns.indexOf(index % secondMap.width)
                    && -1 === borderRows.indexOf(Math.floor(index / secondMap.width));
            });
            this.assertDeepEqual(offBorderIndexes, [], 'Every change point must be on the map border');
        });
    }

    async testGenerateRunsTownAndDoorAssociations()
    {
        let examplesFolder = FileHandler.joinPaths(this.testDataFolder, '..', '..', 'examples', 'layer-elements-composite');
        let generatedFolder = FileHandler.joinPaths(this.testDataFolder, 'generated-with-associations');
        let mapData = FileHandler.fetchFileJson(
            FileHandler.joinPaths(examplesFolder, 'map-composite-data-with-associations.json')
        );
        mapData.mapsInformation = [{mapName: 'assoc-town-001', mapTitle: 'Town 1'}];
        await this.test('generate produces the town map then spawns its door-linked interior sub-maps', async () => {
            Math.random = this.seedRandom(86420);
            try {
                let generator = new MultipleWithAssociationsByLoaderGenerator({
                    loaderData: {rootFolder: examplesFolder, generatedFolder, mapData}
                });
                await generator.generate();
                this.assert(
                    generator.generators['assoc-town-001'] instanceof RandomMapGenerator,
                    'the main town generator must be a real RandomMapGenerator instance'
                );
                this.assertValidMapStructure(generator.generatedMaps['assoc-town-001']);
                let coordinator = generator.associatedMaps['assoc-town-001'];
                this.assert(coordinator instanceof AssociatedMaps, 'an AssociatedMaps coordinator must be created per town');
                let interiorGenerators = Object.keys(coordinator.generators);
                this.assert(0 < interiorGenerators.length, 'the matched town doors must spawn interior sub-map generators');
                let interiorMaps = Object.keys(coordinator.generatedSubMaps);
                this.assert(0 < interiorMaps.length, 'the door-linked interior sub-maps must be generated and recorded');
                let hasHouseInterior = interiorMaps.some(name => -1 !== name.indexOf('house'));
                this.assert(hasHouseInterior, 'interior sub-map names must derive from the fused house change-points layers');
                this.assertOptimizedFolderCleaned(generatedFolder);
            } finally {
                this.restoreMathRandom();
            }
        });
    }

    async testConstruction()
    {
        await this.test('Constructs and exposes expected method and state', async () => {
            let generator = new MultipleWithAssociationsByLoaderGenerator({loaderData: {rootFolder: this.testDataFolder}});
            this.assert(
                generator instanceof MultipleWithAssociationsByLoaderGenerator,
                'Expected MultipleWithAssociationsByLoaderGenerator instance'
            );
            this.assert('function' === typeof generator.generate, 'Expected generate method');
            this.assertDeepEqual(generator.generators, {});
            this.assertDeepEqual(generator.generatedMaps, {});
            this.assertDeepEqual(generator.associatedMaps, {});
        });
    }

    async testGenerateReturnsFalseWithoutLoaderData()
    {
        await this.test('generate returns false when loader data is undefined', async () => {
            let generator = new MultipleWithAssociationsByLoaderGenerator({});
            let result = await generator.generate();
            this.assertEqual(result, false);
        });
    }

}

module.exports.TestMultipleWithAssociationsByLoaderGenerator = TestMultipleWithAssociationsByLoaderGenerator;
