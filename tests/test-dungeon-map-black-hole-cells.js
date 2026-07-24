/**
 *
 * Reldens - Dungeon map black-hole cells: locate all-zero cells (uncovered by every layer) adjacent to cave content
 *
 */

const { BaseMapGeneratorTest } = require('./base-map-generator-test');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class TestDungeonMapBlackHoleCells extends BaseMapGeneratorTest
{

    async testBlackHoleCells()
    {
        let L = (m) => Logger.log(100, '', '[SYMPTOM-C] '+m);
        let jsonPath = FileHandler.joinPaths(this.testDataFolder, 'dungeon-walls-expected.json');
        let map = JSON.parse(FileHandler.readFile(jsonPath));
        let W = map.width, H = map.height;
        L('dims '+W+'x'+H+' totalCells='+(W*H)+' layers='+map.layers.length);
        let tileLayers = map.layers.filter(l => Array.isArray(l.data));
        let coverage = new Int16Array(W*H);
        for(let l of tileLayers){
            let d = l.data;
            for(let i=0;i<d.length;i++){ if(d[i]!==0){ coverage[i]++; } }
        }
        let idx = (x,y) => y*W+x;
        let allZero = [];
        for(let i=0;i<W*H;i++){ if(coverage[i]===0){ allZero.push(i); } }
        L('total all-zero cells (no tile in ANY layer): '+allZero.length);
        let nz = (x,y) => (x>=0&&x<W&&y>=0&&y<H) ? coverage[idx(x,y)]>0 : false;
        let adjacent = [];
        for(let i of allZero){
            let x=i%W, y=(i-x)/W;
            let below=nz(x,y+1), above=nz(x,y-1), left=nz(x-1,y), right=nz(x+1,y);
            let cnt=0;
            for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(dx===0&&dy===0)continue; if(nz(x+dx,y+dy))cnt++; }
            if(cnt>0){ adjacent.push({i,x,y,below,above,left,right,cnt}); }
        }
        L('all-zero cells adjacent to content (>=1 nonzero neighbor): '+adjacent.length);
        let holesBelow = adjacent.filter(a=>a.below);
        let holesNotch = adjacent.filter(a=>a.cnt>=5);
        L('  with CONTENT DIRECTLY BELOW (black hole above a wall/top row): '+holesBelow.length);
        L('  surrounded (>=5 nonzero neighbors = interior notch): '+holesNotch.length);
        let layerAt = (x,y) => {
            if(x<0||x>=W||y<0||y>=H) return [];
            let names=[];
            for(let l of tileLayers){ let v=l.data[idx(x,y)]; if(v!==0){ names.push(l.name+'='+v); } }
            return names;
        };
        let dump = (a) => {
            L('  HOLE idx='+a.i+' (x='+a.x+',y='+a.y+') below='+a.below+' above='+a.above+' left='+a.left+' right='+a.right+' cnt='+a.cnt);
            L('     below ('+a.x+','+(a.y+1)+'): '+JSON.stringify(layerAt(a.x,a.y+1)));
            L('     above ('+a.x+','+(a.y-1)+'): '+JSON.stringify(layerAt(a.x,a.y-1)));
            L('     left  ('+(a.x-1)+','+a.y+'): '+JSON.stringify(layerAt(a.x-1,a.y)));
            L('     right ('+(a.x+1)+','+a.y+'): '+JSON.stringify(layerAt(a.x+1,a.y)));
        };
        L('=== sample holes with content directly below (up to 14) ===');
        for(let a of holesBelow.slice(0,14)){ dump(a); }
        L('=== sample interior-notch holes (up to 8) ===');
        for(let a of holesNotch.slice(0,8)){ dump(a); }
        let spotGroundLayers = tileLayers.filter(l => /-s\d+$/.test(l.name));
        L('=== per spot-ground layer bounding boxes ===');
        for(let l of spotGroundLayers){
            let d=l.data; let minX=W,minY=H,maxX=-1,maxY=-1,count=0;
            for(let i=0;i<d.length;i++){ if(d[i]!==0){ let x=i%W,y=(i-x)/W; count++; if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y; } }
            L('  spot '+l.name+' count='+count+' bbox x['+minX+'..'+maxX+'] y['+minY+'..'+maxY+']');
            if(count>0){
                let cx = Math.floor((minX+maxX)/2);
                let rep=[];
                for(let y=minY-4;y<=minY+2;y++){ rep.push('y'+y+':cov'+((y>=0&&y<H)?coverage[idx(cx,y)]:'-')); }
                L('     column x='+cx+' top rows coverage: '+rep.join(' '));
            }
        }
        this.assert(true, 'analysis done');
    }

}

module.exports.TestDungeonMapBlackHoleCells = TestDungeonMapBlackHoleCells;
