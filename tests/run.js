/**
 *
 * Reldens - Tile Map Generator Test Runner
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

Logger.activeLogLevels = [100];
Logger.setLogLevel(100);
Logger.addTimeStamp = false;
Logger.context().RELDENS_ENABLE_TRACE_FOR = 'none';

async function runTests()
{
    try {
        Logger.log(100, '', '='.repeat(60));
        Logger.log(100, '', 'TESTING RANDOM MAP GENERATOR');
        Logger.log(100, '', '='.repeat(60)+'\n');
        Logger.log(100, '', 'Test execution started: '+sc.formatDate(new Date()));
        let mainTestFiles = await getTestFilesFromDirectory(__dirname);
        let functionalityTestFiles = await getTestFilesFromDirectory(FileHandler.joinPaths(__dirname, 'functionality'));
        let integrationTestFiles = await getTestFilesFromDirectory(FileHandler.joinPaths(__dirname, 'integration'));
        let allTestFiles = [
            ...mainTestFiles.map(file => ({file, path: __dirname})),
            ...functionalityTestFiles.map(file => ({file, path: FileHandler.joinPaths(__dirname, 'functionality')})),
            ...integrationTestFiles.map(file => ({file, path: FileHandler.joinPaths(__dirname, 'integration')}))
        ];
        let totalTests = 0;
        let totalPassed = 0;
        for(let testInfo of allTestFiles){
            let testDisplayName = getTestDisplayName(testInfo.file);
            Logger.log(100, '', 'Running '+testDisplayName+' ('+testInfo.file+')');
            let testModule = require(FileHandler.joinPaths(testInfo.path, testInfo.file));
            let TestClassName = Object.keys(testModule)[0];
            let TestClass = testModule[TestClassName];
            let testInstance = new TestClass();
            await testInstance.runAllTests();
            totalTests += testInstance.testCount;
            totalPassed += testInstance.passedCount;
        }
        Logger.log(100, '', 'All tests executed - '+totalPassed+'/'+totalTests+' succeed.');
    } catch(error){
        Logger.log(100, '', 'Test execution failed: '+error.message);
        Logger.log(100, '', error.stack);
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
    Logger.log(100, '', 'Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    Logger.log(100, '', 'Uncaught Exception:', error);
    process.exit(1);
});

runTests();
