/**
 *
 * Reldens - Tile Map Generator
 *
 */

const { RandomMapGenerator } = require('./lib/random-map-generator');
const { AssociatedMaps } = require('./lib/generator/associated-maps');
const { ElementsProvider } = require('./lib/generator/elements-provider');
const { MultipleByLoaderGenerator } = require('./lib/generator/multiple-by-loader-generator');
const { MultipleWithAssociationsByLoaderGenerator } = require(
    './lib/generator/multiple-with-associations-by-loader-generator'
);
const { PropertiesMapper } = require('./lib/generator/properties-mapper');
const { LayerElementsCompositeLoader } = require('./lib/loader/layer-elements-composite-loader');
const { LayerElementsObjectLoader } = require('./lib/loader/layer-elements-object-loader');
const { MapDataMapper } = require('./lib/map/data-mapper');
const { PathFinder } = require('./lib/path-finder/path-finder');
const { MapCompositeDataSchema } = require('./lib/schemas/map-composite-data-schema');
const { MapDataSchema } = require('./lib/schemas/map-data-schema');
const { OptionsValidator } = require('./lib/validator/options-validator');

module.exports = {
    RandomMapGenerator,
    AssociatedMaps,
    ElementsProvider,
    MultipleByLoaderGenerator,
    MultipleWithAssociationsByLoaderGenerator,
    PropertiesMapper,
    LayerElementsCompositeLoader,
    LayerElementsObjectLoader,
    MapDataMapper,
    PathFinder,
    MapCompositeDataSchema,
    MapDataSchema,
    OptionsValidator
};
