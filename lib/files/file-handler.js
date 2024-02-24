/**
 *
 * Reldens - Tile Map Generator - FileHandler
 *
 */

const fs = require("fs");
let path = require('path');

const { Logger} = require('@reldens/utils');

class FileHandler
{

    joinPaths(...paths)
    {
        return path.join(...paths);
    }

    writeFile(fileName, content)
    {
        fs.writeFile(fileName, content, 'utf8', (err) => {
            if(err){
                Logger.error('Error saving the map:', err);
                return;
            }
            Logger.info('The map has been saved!');
        });
    }

}

module.exports.FileHandler = FileHandler;
