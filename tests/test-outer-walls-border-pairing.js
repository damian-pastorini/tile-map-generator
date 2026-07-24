/**
 * Temporary adversarial verification analyzer (delete after run).
 */
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/damia/AppData/Local/Temp/claude/D--dap-work-reldens-npm-packages-tile-map-generator/53c16d9e-6a41-407d-9c29-f3eb01c9ab4c/scratchpad/verify-out.txt';

class TestOuterWallsBorderPairing
{
    constructor(){ this.testCount = 0; this.passedCount = 0; }

    async runAllTests()
    {
        const lines = [];
        const log = (s) => lines.push(String(s));
        try {
            this.analyze(log);
        } catch(e){
            log('ERROR ' + e.message + '\n' + e.stack);
        }
        fs.writeFileSync(OUT, lines.join('\n'));
        this.testCount = 1; this.passedCount = 1;
    }

    analyze(log)
    {
        const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-data', 'dungeon-walls-expected.json'), 'utf8'));
        const W = j.width, H = j.height;
        log('MAP ' + W + 'x' + H + ' layers=' + j.layers.length);

        const layers = {};
        for(const l of j.layers){
            if(Array.isArray(l.data)){
                layers[l.name] = l;
            }
        }

        const outerNames = Object.keys(layers).filter(n => n.includes('outer-walls'));
        const borderNames = Object.keys(layers).filter(n => n.includes('borders') && !n.includes('outer-walls') && !n.includes('inner-walls'));
        log('OUTER LAYERS: ' + JSON.stringify(outerNames));
        log('BORDER LAYERS: ' + JSON.stringify(borderNames));

        const nz = (d) => d.filter(v => v !== 0).length;
        for(const n of Object.keys(layers)){
            const l = layers[n];
            log('LAYER ' + n + ' size=' + l.width + 'x' + l.height + ' nz=' + nz(l.data) + ' len=' + l.data.length);
        }

        const perSpotOuter = outerNames.filter(n => n.includes('-over-player'));
        for(const on of perSpotOuter){
            const base = on.replace('-outer-walls-collisions-over-player', '');
            const bn = base + '-borders-collisions-over-player';
            const inn = base + '-inner-walls-collisions';
            this.pairCheck(log, layers, W, H, on, bn, inn);
        }

        this.pairCheck(log, layers, W, H,
            'path-borders-outer-walls-collisions',
            'path-borders-collisions',
            'path-borders-inner-walls-collisions');
    }

    pairCheck(log, layers, W, H, outerName, borderName, innerName)
    {
        const O = layers[outerName] ? layers[outerName].data : null;
        const B = layers[borderName] ? layers[borderName].data : null;
        const I = layers[innerName] ? layers[innerName].data : null;
        log('\n=== PAIR outer=' + outerName + ' | border=' + borderName + ' | inner=' + innerName);
        if(!O || !B){
            log('  MISSING (O=' + !!O + ' B=' + !!B + ' I=' + !!I + ')');
            return;
        }
        let both = [];
        for(let i = 0; i < O.length; i++){
            if(O[i] !== 0 && B[i] !== 0){
                both.push(i);
            }
        }
        log('  OVERLAP outer&border count=' + both.length + ' first=' + JSON.stringify(both.slice(0, 10).map(i => ({i, x: i % W, y: Math.floor(i / W), o: O[i], b: B[i]}))));

        if(I){
            let bi = 0;
            for(let i = 0; i < O.length; i++){ if(O[i] !== 0 && I[i] !== 0){ bi++; } }
            log('  OVERLAP outer&inner count=' + bi);
        }

        let iso = [];
        for(let i = 0; i < O.length; i++){
            if(O[i] === 0){ continue; }
            const x = i % W, y = Math.floor(i / W);
            const up = y > 0 ? O[i - W] : 0;
            const down = y < H - 1 ? O[i + W] : 0;
            const left = x > 0 ? O[i - 1] : 0;
            const right = x < W - 1 ? O[i + 1] : 0;
            if(up === 0 && down === 0 && left === 0 && right === 0){
                iso.push({i, x, y, v: O[i]});
            }
        }
        log('  ISOLATED outer cells count=' + iso.length + ' first=' + JSON.stringify(iso.slice(0, 12)));

        let strays = [];
        for(let i = 0; i < O.length; i++){
            if(O[i] === 0){ continue; }
            const x = i % W, y = Math.floor(i / W);
            let touches = false;
            for(let dy = -1; dy <= 1 && !touches; dy++){
                for(let dx = -1; dx <= 1; dx++){
                    const nx = x + dx, ny = y + dy;
                    if(nx < 0 || nx >= W || ny < 0 || ny >= H){ continue; }
                    const ni = ny * W + nx;
                    if(B[ni] !== 0 || (I && I[ni] !== 0)){ touches = true; break; }
                }
            }
            if(!touches){ strays.push({i, x, y, v: O[i]}); }
        }
        log('  STRAY outer (no border/inner in 8-nbhd) count=' + strays.length + ' first=' + JSON.stringify(strays.slice(0, 12)));

        let edge = [];
        for(let i = 0; i < O.length; i++){
            if(O[i] === 0){ continue; }
            const x = i % W;
            if(x === 0 || x === W - 1){ edge.push({i, x, y: Math.floor(i / W), v: O[i]}); }
        }
        log('  OUTER at col0/colW-1 count=' + edge.length + ' first=' + JSON.stringify(edge.slice(0, 12)));
    }
}

module.exports.TestOuterWallsBorderPairing = TestOuterWallsBorderPairing;
