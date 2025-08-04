/**
 *
 * Reldens - Tile Map Generator Test Runner
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

Logger.activeLogLevels = [100];
Logger.setLogLevel(100);

async function runTests()
{
    try {
        Logger.log(100, 't', '='.repeat(60));
        Logger.log(100, 't', 'TESTING RANDOM MAP GENERATOR');
        Logger.log(100, 't', '='.repeat(60)+'\n');
        let mainTestFiles = await getTestFilesFromDirectory(__dirname);
        let functionalityTestFiles = await getTestFilesFromDirectory(FileHandler.joinPaths(__dirname, 'functionality'));
        let integrationTestFiles = await getTestFilesFromDirectory(FileHandler.joinPaths(__dirname, 'integration'));
        let allTestFiles = [
            ...mainTestFiles.map(file => ({file, path: __dirname})),
            ...functionalityTestFiles.map(file => ({file, path: FileHandler.joinPaths(__dirname, 'functionality')})),
            ...integrationTestFiles.map(file => ({file, path: FileHandler.joinPaths(__dirname, 'integration')}))
        ];
        for(let testInfo of allTestFiles){
            let testDisplayName = getTestDisplayName(testInfo.file);
            Logger.log(100, 't', 'Running '+testDisplayName+' ('+testInfo.file+')');
            let testModule = require(FileHandler.joinPaths(testInfo.path, testInfo.file));
            let TestClassName = Object.keys(testModule)[0];
            let TestClass = testModule[TestClassName];
            let testInstance = new TestClass();
            await testInstance.runAllTests();
        }
        Logger.log(100, 't', 'All tests completed successfully!');
    } catch(error){
        Logger.log(100, 't', 'Test execution failed: '+error.message);
        Logger.log(100, 't', error.stack);
        process.exit(1);
    }
}

function getTestDisplayName(fileName)
{
    return fileName
        .replace(/^test-/, '')
        .replace(/\.js$/, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        + ' Tests';
}

async function getTestFilesFromDirectory(directoryPath)
{
    if(!FileHandler.exists(directoryPath)){
        return [];
    }
    let files = FileHandler.readFolder(directoryPath);
    return files.filter(file => file.startsWith('test-') && file.endsWith('.js'));
}

process.on('unhandledRejection', (reason, promise) => {
    Logger.log(100, 't', 'Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    Logger.log(100, 't', 'Uncaught Exception:', error);
    process.exit(1);
});

runTests();
