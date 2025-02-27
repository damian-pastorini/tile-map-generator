/**
 *
 * Reldens - FileHandler
 *
 */

const fs = require('fs');
const path = require('path');
const { Logger, sc } = require('@reldens/utils');

class FileHandler
{

    constructor()
    {
        this.encoding = 'utf8';
    }

    joinPaths(...paths)
    {
        return path.join(...paths);
    }

    copyFile(from, to, folder)
    {
        if(!this.exists(from)){
            return false;
        }
        if(!this.exists(folder)){
            return false;
        }
        fs.copyFileSync(from, path.join(folder, to));
        return true;
    }

    createFolder(folderPath)
    {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    readFolder(folderPath, recursive = false)
    {
        return fs.readdirSync(folderPath, {recursive});
    }

    readFile(filePath)
    {
        return fs.readFileSync(filePath);
    }

    async writeFile(fileName, content)
    {
        return fs.writeFile(fileName, content, this.encoding, (err) => {
            if(err){
                Logger.error('Error saving the file:', err);
                return false;
            }
            Logger.debug('The file has been saved! New file name: '+fileName);
            return true;
        });
    }

    exists(fullPath)
    {
        if(!fs.existsSync(fullPath)){
            Logger.debug(`File or folder "${fullPath}" does not exist.`);
            return false;
        }
        return true;
    }

    removeByPath(fullPath)
    {
        if(!this.exists(fullPath)){
            return false;
        }
        let stats = fs.statSync(fullPath);
        if(stats.isFile()){
            fs.unlinkSync(fullPath);
            Logger.debug(`File "${fullPath}" has been removed.`);
            return true;
        }
        if(stats.isDirectory()){
            fs.rmdirSync(fullPath, { recursive: true }); // Remove folder recursively
            Logger.debug(`Folder "${fullPath}" has been removed.`);
            return true;
        }
        Logger.warning(`"${fullPath}" is neither a file nor a folder.`);
        return false;
    }

    loadJsonFromFile(filePath)
    {
        if(!this.exists(filePath)){
            Logger.error('File not found: ' + filePath);
            return false;
        }
        let fileContents = this.readFile(filePath);
        if(!fileContents){
            Logger.error('File cannot be read: '+filePath);
            return false;
        }
        return sc.parseJson(fileContents);
    }

}

module.exports.FileHandler = FileHandler;
