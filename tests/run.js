/**
 *
 * Reldens - Tile Map Generator Test Runner
 *
 */

const { FileHandler } = require('@reldens/server-utils');

async function runTests()
{
    console.log('Running all tests...\n');
    try {
        console.log('='.repeat(60));
        console.log('TESTING RANDOM MAP GENERATOR');
        console.log('='.repeat(60));
        let testFiles = FileHandler.readFolder(__dirname).filter(file =>
            file.startsWith('test-') && file.endsWith('.js')
        );
        for(let testFile of testFiles){
            console.log(`\nRunning ${testFile}...`);
            let testModule = require(FileHandler.joinPaths(__dirname, testFile));
            let TestClassName = Object.keys(testModule)[0];
            let TestClass = testModule[TestClassName];
            let testInstance = new TestClass();
            await testInstance.runAllTests();
        }
        console.log('\n\nAll tests completed successfully!');
    } catch(error){
        console.error('\nTest execution failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

runTests();
