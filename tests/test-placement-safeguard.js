/**
 *
 * Reldens - Test Placement Safeguard
 *
 * Covers the strict placement feasibility safeguard and the placeRejectResolver behaviors. Unit cases run the
 * real GeometryCalculator and PlacementFeasibility classes over structural walkability grids, integration
 * cases generate complete maps from the committed real element files (house-001.json, tree.json) under fixed
 * seeds and assert against the generator placedElementsJournal.
 *
 */

const { BaseFunctionalityTest } = require('./base-functionality-test');
const { GeometryCalculator } = require('../lib/map/geometry-calculator');
const { PlacementFeasibility } = require('../lib/generator/placement-feasibility');
const { sc } = require('@reldens/utils');

class TestPlacementSafeguard extends BaseFunctionalityTest
{

    buildWalkableGrid(mapWidth, mapHeight)
    {
        let mapGrid = [];
        for(let rowIndex = 0; rowIndex < mapHeight; rowIndex++){
            mapGrid.push(new Array(mapWidth).fill(true));
        }
        return mapGrid;
    }

    blockGridRect(mapGrid, fromColumn, toColumn, fromRow, toRow)
    {
        for(let rowIndex = fromRow; rowIndex <= toRow; rowIndex++){
            for(let columnIndex = fromColumn; columnIndex <= toColumn; columnIndex++){
                mapGrid[rowIndex][columnIndex] = false;
            }
        }
    }

    buildStubGenerator(mapWidth, mapHeight, mapGrid)
    {
        return {
            mapWidth,
            mapHeight,
            mapGrid,
            geometryCalculator: new GeometryCalculator()
        };
    }

    async testIntegralAndWindowDetection()
    {
        await this.test('blocked integral counts cells and window detection respects blocks and exclusions', async () => {
            let geometry = new GeometryCalculator();
            let mapGrid = this.buildWalkableGrid(8, 8);
            this.blockGridRect(mapGrid, 0, 7, 3, 3);
            let integral = geometry.buildBlockedIntegral(mapGrid, 8, 8);
            this.assertEqual(8, integral[integral.length - 1]);
            this.assert(geometry.hasFreeWindow(integral, 8, 8, 8, 3, null), 'expected a free 8x3 window above the blocked row');
            this.assert(!geometry.hasFreeWindow(integral, 8, 8, 8, 6, null), 'expected no free 8x6 window across the blocked row');
            this.assert(!geometry.hasFreeWindow(integral, 8, 8, 9, 1, null), 'expected no window wider than the map');
            this.assert(
                geometry.hasFreeWindow(integral, 8, 8, 8, 3, {x: 0, y: 4, width: 8, height: 4}),
                'expected the top 8x3 window to survive a bottom-band exclusion'
            );
            this.assert(
                !geometry.hasFreeWindow(integral, 8, 8, 8, 3, {x: 0, y: 0, width: 8, height: 8}),
                'expected no 8x3 window when the whole map is excluded'
            );
            this.assert(
                geometry.hasFreeWindow(integral, 8, 8, 8, 4, {x: 0, y: 0, width: 1, height: 1}),
                'expected the bottom 8x4 window to survive a non-overlapping exclusion'
            );
        });
    }

    async testValidatorRejectsCandidateStarvingRemaining()
    {
        await this.test('validator rejects a candidate position that starves a remaining element window', async () => {
            let mapGrid = this.buildWalkableGrid(10, 7);
            let feasibility = new PlacementFeasibility(this.buildStubGenerator(10, 7, mapGrid));
            feasibility.pendingFootprints = [{elementType: 'pending-house', width: 6, height: 6}];
            let starvingValidator = feasibility.buildValidator('candidate-house', 5, 6, 0);
            this.assert(false !== starvingValidator && null !== starvingValidator, 'expected a validator function when space exists');
            this.assert(!starvingValidator(0, 0), 'expected rejection when the candidate overlaps every remaining 6x6 window');
            let fittingValidator = feasibility.buildValidator('candidate-house', 4, 6, 0);
            this.assert(fittingValidator(0, 0), 'expected approval when a 6x6 window remains beside the candidate');
        });
    }

    async testValidatorStrictPerFootprintCoverage()
    {
        await this.test('validator still rejects when a smaller remaining footprint is starved while the largest fits', async () => {
            let mapGrid = this.buildWalkableGrid(14, 7);
            this.blockGridRect(mapGrid, 10, 13, 0, 5);
            let feasibility = new PlacementFeasibility(this.buildStubGenerator(14, 7, mapGrid));
            feasibility.pendingFootprints = [
                {elementType: 'wide-bridge', width: 8, height: 1},
                {elementType: 'tall-tower', width: 1, height: 6}
            ];
            let validator = feasibility.buildValidator('candidate-house', 10, 6, 0);
            this.assert(false !== validator && null !== validator, 'expected a validator function when both footprints fit the current grid');
            this.assert(!validator(0, 0), 'expected rejection because the tall footprint is starved even when the wide one fits');
            feasibility.pendingFootprints = [{elementType: 'wide-bridge', width: 8, height: 1}];
            let wideOnlyValidator = feasibility.buildValidator('candidate-house', 10, 6, 0);
            this.assert(wideOnlyValidator(0, 0), 'expected approval when only the wide footprint remains');
        });
    }

    async testGlobalFailShortcutReturnsFalse()
    {
        await this.test('validator build returns the global fail sentinel when a remaining footprint has no window at all', async () => {
            let mapGrid = this.buildWalkableGrid(10, 10);
            let feasibility = new PlacementFeasibility(this.buildStubGenerator(10, 10, mapGrid));
            feasibility.pendingFootprints = [{elementType: 'giant-castle', width: 20, height: 20}];
            this.assertEqual(false, feasibility.buildValidator('candidate-house', 4, 4, 0));
        });
    }

    buildTinyMapConfig(mapName, placeRejectResolver)
    {
        let config = this.setupBasicConfig();
        config.mapName = mapName;
        config.mapSize = {mapWidth: 14, mapHeight: 14};
        config.elementsQuantity = {house1: 2};
        config.elementsFreeSpaceAround = {house1: 1};
        config.orderElementsBySize = false;
        config.placeElementsOrder = 'inOrder';
        config.randomizeQuantities = false;
        config.placeRejectResolver = placeRejectResolver;
        return config;
    }

    async testAutoGrowResolvesRejectedPlacements()
    {
        let config = this.buildTinyMapConfig('safeguard-auto-grow', 'autoGrow');
        await this.testWithDeterministicSeed('auto grow places every element on a too small map', config, 991144, async (map, usedConfig, generator) => {
            this.assertEqual(2, generator.placedElementsJournal.length);
            this.assertEqual(14, generator.mapWidth);
            this.assert(14 < generator.mapHeight, 'expected the map height to grow beyond the configured 14 rows');
            this.assertEqual(map.width, generator.mapWidth);
            this.assertEqual(map.height, generator.mapHeight);
            for(let layer of map.layers){
                this.assertEqual(generator.mapHeight, layer.height);
                this.assertEqual(generator.mapWidth * generator.mapHeight, layer.data.length);
            }
        });
    }

    async testMoveElementsResolvesRejectedPlacements()
    {
        let config = this.buildTinyMapConfig('safeguard-move-elements', 'moveElements');
        await this.testWithDeterministicSeed('move elements resolver places every element on a too small map', config, 991144, async (map, usedConfig, generator) => {
            this.assertEqual(2, generator.placedElementsJournal.length);
            for(let entry of generator.placedElementsJournal){
                this.assertEqual('house1', entry.elementType);
            }
        });
    }

    buildRoomyConfig(mapName)
    {
        let config = this.setupBasicConfig();
        config.mapName = mapName;
        config.elementsQuantity = {house1: 1, tree: 2};
        config.orderElementsBySize = false;
        config.placeElementsOrder = 'inOrder';
        config.randomizeQuantities = false;
        return config;
    }

    async testNoRejectionGenerationIsDeterministic()
    {
        await this.test('a generation without rejections is deterministic and journals every instance', async () => {
            let firstResult = null;
            let secondResult = null;
            try {
                Math.random = this.seedRandom(775533);
                firstResult = await this.testCurrentGenerationWithGenerator(this.buildRoomyConfig('safeguard-deterministic'));
                Math.random = this.seedRandom(775533);
                secondResult = await this.testCurrentGenerationWithGenerator(this.buildRoomyConfig('safeguard-deterministic'));
            } finally {
                this.restoreMathRandom();
            }
            this.assert(firstResult.map && secondResult.map, 'expected both generations to produce a map');
            this.assertEqual(3, firstResult.generator.placedElementsJournal.length);
            this.assertEqual(sc.toJsonString(firstResult.map), sc.toJsonString(secondResult.map));
        });
    }

}

module.exports.TestPlacementSafeguard = TestPlacementSafeguard;
