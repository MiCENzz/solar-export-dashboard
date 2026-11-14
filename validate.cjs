'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createModel,shiftMonth,ratio}=require('./app.js');
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'public/data/dashboard.json'),'utf8'));
const M=createModel(D),latest=D.meta.report_month;
assert.equal(shiftMonth('202601',-1),'202512');
assert.equal(shiftMonth('202601',-12),'202501');
assert.equal(ratio(4,0),null);
assert.equal(ratio(null,4),null);
const z=D.series.zujian.find(r=>r.m===latest);
assert.equal(M.selected('zujian',latest,'month').vol,z.vol);
const expected=D.series.zujian.filter(r=>r.m>=latest.slice(0,4)+'01'&&r.m<=latest).reduce((s,r)=>s+r.vol,0);
assert.equal(M.selected('zujian',latest,'ytd').vol,expected);
const r=M.countries('zujian',latest,'month')[0];
assert.equal(r.share,r.vol/z.vol);
const fixture={series:{zujian:[{m:'202601',vol:10,amt:1,price:.1},{m:'202602',vol:20,amt:null,price:.09}],guiliao:[{m:'202603',vol:2,amt:1}]},countries:{zujian:[{m:'202602',name:'样本',vol:1,type:'report_supplement',source_row:2}]}};
const F=createModel(fixture);
assert.equal(F.selected('zujian','202602','month').amt,null);
assert.equal(F.selected('zujian','202602','ytd').price,null);
assert.equal(F.selected('guiliao','202603','ytd').vol,null);
assert.equal(F.countries('zujian','202602','month')[0].yoy,null);
for(const [k,rows] of Object.entries(D.countries)){
 for(const row of rows)assert.ok(row.source_row>=2);
}
for(const gap of D.region_gaps){
 const t=D.series.zujian.find(r=>r.m===gap.m).vol;
 const sum=D.regions.filter(r=>r.m===gap.m).reduce((s,r)=>s+r.vol,0);
 assert.ok(Math.abs(sum+gap.vol-t)<1e-6);
}
assert.ok(fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8').includes('./assets/app.js'));
console.log('PASS: month alignment, zero/missing values, YTD, market share, source rows, regional reconciliation, static files.');

