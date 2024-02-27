/**
 *
 * Reldens - Tile Map Generator - JsonFormatter
 *
 */

class JsonFormatter
{

    static mapToJSON(map)
    {
        let jsonString = JSON.stringify(map, null, 4);
        let dataPattern = /("data":\s*\[\n\s*)([\s\S]*?)(\n\s*\])/g;

        return jsonString.replace(dataPattern, (match, start, dataArray, end) => {
            let singleLineArray = dataArray.replace(/\s+/g, '');
            return `${start.trim()}${singleLineArray}${end.trim()}`;
        });
    }

}

module.exports.JsonFormatter = JsonFormatter;
