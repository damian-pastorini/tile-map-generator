/**
 *
 * Reldens - Tile Map Generator - StatisticalAnalyzer
 *
 */

const { sc } = require('@reldens/utils');

class StatisticalAnalyzer
{

    calculateTileDistribution(layerData, width, height)
    {
        if(!sc.isArray(layerData)){
            return {isValid: false, error: 'Layer data must be an array'};
        }
        if(0 === layerData.length){
            return {isValid: false, error: 'Layer data cannot be empty'};
        }
        let tileFrequency = {};
        let totalTiles = layerData.length;
        for(let tile of layerData){
            if(!sc.hasOwn(tileFrequency, tile)){
                tileFrequency[tile] = 0;
            }
            tileFrequency[tile]++;
        }
        let distribution = {};
        let uniqueTiles = Object.keys(tileFrequency);
        for(let tileValue of uniqueTiles){
            let frequency = tileFrequency[tileValue];
            distribution[tileValue] = {
                count: frequency,
                percentage: (frequency / totalTiles) * 100,
                density: frequency / (width * height)
            };
        }
        return {
            isValid: true,
            totalTiles,
            uniqueTileCount: uniqueTiles.length,
            distribution,
            mostCommonTile: this.findMostCommonTile(tileFrequency),
            leastCommonTile: this.findLeastCommonTile(tileFrequency)
        };
    }

    findMostCommonTile(tileFrequency)
    {
        let tileKeys = Object.keys(tileFrequency);
        if(0 === tileKeys.length){
            return null;
        }
        let mostCommonTile = tileKeys[0];
        let highestCount = tileFrequency[mostCommonTile];
        for(let tileValue of tileKeys){
            if(tileFrequency[tileValue] > highestCount){
                highestCount = tileFrequency[tileValue];
                mostCommonTile = tileValue;
            }
        }
        return {tile: mostCommonTile, count: highestCount};
    }

    findLeastCommonTile(tileFrequency)
    {
        let tileKeys = Object.keys(tileFrequency);
        if(0 === tileKeys.length){
            return null;
        }
        let leastCommonTile = tileKeys[0];
        let lowestCount = tileFrequency[leastCommonTile];
        for(let tileValue of tileKeys){
            if(tileFrequency[tileValue] < lowestCount){
                lowestCount = tileFrequency[tileValue];
                leastCommonTile = tileValue;
            }
        }
        return {tile: leastCommonTile, count: lowestCount};
    }

    calculateSpatialClustering(layerData, width, height, targetTileValue)
    {
        if(!sc.isArray(layerData)){
            return {isValid: false, error: 'Layer data must be an array'};
        }
        let targetPositions = this.findTilePositions(layerData, width, height, targetTileValue);
        if(0 === targetPositions.length){
            return {
                isValid: true,
                targetTileCount: 0,
                clusters: [],
                averageClusterSize: 0,
                largestCluster: 0,
                totalClusters: 0
            };
        }
        let clusters = this.identifyClusters(targetPositions, width, height);
        let clusterSizes = clusters.map(cluster => cluster.length);
        let totalClusters = clusters.length;
        let averageClusterSize = totalClusters > 0
            ? clusterSizes.reduce((sum, size) => sum + size, 0) / totalClusters
            : 0;
        let largestCluster = totalClusters > 0 ? Math.max(...clusterSizes) : 0;
        return {
            isValid: true,
            targetTileCount: targetPositions.length,
            clusters,
            clusterSizes,
            averageClusterSize,
            largestCluster,
            totalClusters,
            clusteringCoefficient: this.calculateClusteringCoefficient(targetPositions, clusters)
        };
    }

    findTilePositions(layerData, width, height, tileValue)
    {
        let positions = [];
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                let index = y * width + x;
                if(layerData[index] === tileValue){
                    positions.push({x, y, index});
                }
            }
        }
        return positions;
    }

    identifyClusters(positions, width, height)
    {
        let visited = new Set();
        let clusters = [];
        for(let position of positions){
            let positionKey = position.x+','+position.y;
            if(visited.has(positionKey)){
                continue;
            }
            let cluster = this.exploreCluster(position, positions, visited, width, height);
            if(0 < cluster.length){
                clusters.push(cluster);
            }
        }
        return clusters;
    }

    exploreCluster(startPosition, allPositions, visited, width, height)
    {
        let cluster = [];
        let queue = [startPosition];
        let positionMap = new Map();
        for(let pos of allPositions){
            let key = pos.x+','+pos.y;
            positionMap.set(key, pos);
        }
        while(0 < queue.length){
            let currentPos = queue.shift();
            let currentKey = currentPos.x+','+currentPos.y;
            if(visited.has(currentKey)){
                continue;
            }
            visited.add(currentKey);
            cluster.push(currentPos);
            let neighbors = this.getAdjacentPositions(currentPos, width, height);
            for(let neighbor of neighbors){
                let neighborKey = neighbor.x+','+neighbor.y;
                if(visited.has(neighborKey)){
                    continue;
                }
                if(!positionMap.has(neighborKey)){
                    continue;
                }
                queue.push(neighbor);
            }
        }
        return cluster;
    }

    getAdjacentPositions(position, width, height)
    {
        let adjacent = [];
        let directions = [
            {dx: 0, dy: -1},
            {dx: 1, dy: 0},
            {dx: 0, dy: 1},
            {dx: -1, dy: 0}
        ];
        for(let direction of directions){
            let newX = position.x + direction.dx;
            let newY = position.y + direction.dy;
            if(newX >= 0 && newX < width && newY >= 0 && newY < height){
                adjacent.push({x: newX, y: newY});
            }
        }
        return adjacent;
    }

    calculateClusteringCoefficient(positions, clusters)
    {
        if(0 === positions.length){
            return 0;
        }
        let totalPossibleClusters = positions.length;
        let actualClusters = clusters.length;
        let avgClusterSize = actualClusters > 0 ? positions.length / actualClusters : 0;
        return {
            clusterRatio: actualClusters / totalPossibleClusters,
            averageClusterSize: avgClusterSize,
            clusterEfficiency: actualClusters > 0 ? Math.max(...clusters.map(c => c.length)) / positions.length : 0
        };
    }

    analyzePathConnectivity(layerData, width, height, pathTileValue)
    {
        if(!sc.isArray(layerData)){
            return {isValid: false, error: 'Layer data must be an array'};
        }
        let pathPositions = this.findTilePositions(layerData, width, height, pathTileValue);
        if(0 === pathPositions.length){
            return {
                isValid: true,
                pathTileCount: 0,
                connectedComponents: 0,
                largestComponent: 0,
                connectivityRatio: 0
            };
        }
        let connectedComponents = this.identifyClusters(pathPositions, width, height);
        let componentSizes = connectedComponents.map(component => component.length);
        let largestComponent = componentSizes.length > 0 ? Math.max(...componentSizes) : 0;
        let connectivityRatio = largestComponent / pathPositions.length;
        return {
            isValid: true,
            pathTileCount: pathPositions.length,
            connectedComponents: connectedComponents.length,
            componentSizes,
            largestComponent,
            connectivityRatio,
            isFullyConnected: 1 === connectedComponents.length
        };
    }

    calculateMapComplexity(layerData, width, height)
    {
        if(!sc.isArray(layerData)){
            return {isValid: false, error: 'Layer data must be an array'};
        }
        let distribution = this.calculateTileDistribution(layerData, width, height);
        if(!distribution.isValid){
            return distribution;
        }
        let entropy = this.calculateEntropy(distribution.distribution);
        let uniformity = this.calculateUniformity(distribution.distribution);
        let diversity = distribution.uniqueTileCount / layerData.length;
        let patterns = this.analyzeLocalPatterns(layerData, width, height);
        return {
            isValid: true,
            entropy,
            uniformity,
            diversity,
            patternComplexity: patterns.complexity,
            repetitivePatterns: patterns.repetitiveCount,
            uniquePatterns: patterns.uniqueCount,
            overallComplexity: (entropy + diversity + patterns.complexity) / 3
        };
    }

    calculateEntropy(distribution)
    {
        let entropy = 0;
        let tileTypes = Object.keys(distribution);
        for(let tileType of tileTypes){
            let probability = distribution[tileType].percentage / 100;
            if(0 < probability){
                entropy -= probability * Math.log2(probability);
            }
        }
        return entropy;
    }

    calculateUniformity(distribution)
    {
        let tileTypes = Object.keys(distribution);
        if(0 === tileTypes.length){
            return 1;
        }
        let expectedPercentage = 100 / tileTypes.length;
        let totalDeviation = 0;
        for(let tileType of tileTypes){
            let actualPercentage = distribution[tileType].percentage;
            totalDeviation += Math.abs(actualPercentage - expectedPercentage);
        }
        let maxDeviation = 100 - expectedPercentage;
        let uniformityScore = 1 - (totalDeviation / (tileTypes.length * maxDeviation));
        return Math.max(0, uniformityScore);
    }

    analyzeLocalPatterns(layerData, width, height)
    {
        let patternSize = 3;
        let patterns = new Map();
        let totalPatterns = 0;
        for(let y = 0; y <= height - patternSize; y++){
            for(let x = 0; x <= width - patternSize; x++){
                let pattern = this.extractPattern(layerData, x, y, patternSize, width);
                let patternKey = pattern.join(',');
                if(!patterns.has(patternKey)){
                    patterns.set(patternKey, 0);
                }
                patterns.set(patternKey, patterns.get(patternKey) + 1);
                totalPatterns++;
            }
        }
        let uniqueCount = patterns.size;
        let repetitiveCount = 0;
        for(let count of patterns.values()){
            if(1 < count){
                repetitiveCount++;
            }
        }
        let complexity = uniqueCount / totalPatterns;
        return {
            complexity,
            uniqueCount,
            repetitiveCount,
            totalPatterns,
            patternFrequency: Array.from(patterns.entries())
        };
    }

    extractPattern(layerData, startX, startY, size, width)
    {
        let pattern = [];
        for(let y = startY; y < startY + size; y++){
            for(let x = startX; x < startX + size; x++){
                let index = y * width + x;
                pattern.push(layerData[index]);
            }
        }
        return pattern;
    }

    analyzeMapBalance(layerData, width, height, balanceRules)
    {
        if(!sc.isArray(layerData)){
            return {isValid: false, error: 'Layer data must be an array'};
        }
        if(!sc.isObject(balanceRules)){
            return {isValid: false, error: 'Balance rules must be an object'};
        }
        let distribution = this.calculateTileDistribution(layerData, width, height);
        if(!distribution.isValid){
            return distribution;
        }
        let balanceAnalysis = {
            isValid: true,
            overallBalance: 0,
            ruleViolations: [],
            tileBalanceScores: {}
        };
        let ruleKeys = Object.keys(balanceRules);
        let totalScore = 0;
        let evaluatedRules = 0;
        for(let ruleKey of ruleKeys){
            let rule = balanceRules[ruleKey];
            let expectedPercentage = sc.get(rule, 'expectedPercentage', 0);
            let tolerance = sc.get(rule, 'tolerance', 5);
            let tileValue = sc.get(rule, 'tileValue', null);
            if(null === tileValue){
                continue;
            }
            let actualPercentage = sc.get(distribution.distribution, tileValue+'.percentage', 0);
            let deviation = Math.abs(actualPercentage - expectedPercentage);
            let isWithinTolerance = deviation <= tolerance;
            let score = Math.max(0, 1 - (deviation / 100));
            balanceAnalysis.tileBalanceScores[tileValue] = {
                expectedPercentage,
                actualPercentage,
                deviation,
                tolerance,
                score,
                isWithinTolerance
            };
            if(!isWithinTolerance){
                balanceAnalysis.ruleViolations.push({
                    ruleKey,
                    tileValue,
                    expectedPercentage,
                    actualPercentage,
                    deviation,
                    tolerance
                });
            }
            totalScore += score;
            evaluatedRules++;
        }
        balanceAnalysis.overallBalance = evaluatedRules > 0 ? totalScore / evaluatedRules : 0;
        balanceAnalysis.isValid = 0 === balanceAnalysis.ruleViolations.length;
        return balanceAnalysis;
    }

}

module.exports.StatisticalAnalyzer = StatisticalAnalyzer;
