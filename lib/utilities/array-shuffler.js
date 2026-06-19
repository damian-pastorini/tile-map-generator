/**
 *
 * Reldens - Tile Map Generator - ArrayShuffler
 *
 */

class ArrayShuffler
{

    shuffleArray(array)
    {
        let newArray = [...array];
        for(let i = newArray.length - 1; i > 0; i--){
            let swapIndex = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[swapIndex]] = [newArray[swapIndex], newArray[i]];
        }
        return newArray;
    }

}

module.exports.ArrayShuffler = ArrayShuffler;
