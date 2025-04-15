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
            /("data":\s*\[)(?:\n\s*)([\s\S]*?)(\n\s*\])/g,
            (match, start, dataArray, end) => {
                return start + '\n' + dataArray.replace(/\s+/g, '') + end;
            }
        );
    }

}

module.exports.JsonFormatter = JsonFormatter;
