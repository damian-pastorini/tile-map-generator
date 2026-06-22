/**
 *
 * Reldens - ReturnPointWriter
 *
 */

class ReturnPointWriter
{

    recordReturnPoint(generatedReturnPoints, properties, recordKey, recordData, pointName, forSuffix, isDefault)
    {
        generatedReturnPoints[recordKey] = recordData;
        let prefix = 'return-point-';
        let type = 'int';
        properties.push(
            {name: prefix+'for-'+forSuffix, type, value: recordData.mapIndex},
            {name: prefix+'x-'+pointName, type, value: recordData.x},
            {name: prefix+'y-'+pointName, type, value: recordData.y},
            {name: prefix+'position-'+pointName, type: 'string', value: recordData.position}
        );
        if(true === isDefault){
            properties.push({name: prefix+'isDefault-'+pointName, type: 'bool', value: true});
        }
    }

    recordChangePoint(generatedChangePoints, properties, recordKey, recordData, pointName)
    {
        generatedChangePoints[recordKey] = recordData;
        properties.push({
            name: 'change-point-for-'+pointName,
            type: 'int',
            value: recordData.mapIndex
        });
    }

}

module.exports.ReturnPointWriter = ReturnPointWriter;
