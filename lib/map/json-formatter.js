/**
 *
 * Reldens - Tile Map Generator - JsonFormatter
 *
 */

class JsonFormatter
{

    static mapToJSON(map)
    {
        return JSON.stringify(map, null, 4).replace(
            /("data":\s*\[\n\s*)([\s\S]*?)(\n\s*\])/g,
            (match, start, dataArray, end) => {
                let compactArray = dataArray.replace(/\s+/g, '');
                return start + '\n' + compactArray + end;
            }
        );
    }

}

module.exports.JsonFormatter = JsonFormatter;
