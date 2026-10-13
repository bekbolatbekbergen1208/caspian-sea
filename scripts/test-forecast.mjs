import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const code=ts.transpileModule(fs.readFileSync('lib/forecast.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {forecastSeries,predict}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const points=['2026-01-01','2026-02-01','2026-03-01','2026-04-01'].map(date=>({date,area:10+(Date.parse(date)-Date.parse('2026-01-01'))/86400000*.01,sensitivity:.2,ids:['test']}));
assert(Math.abs(predict(points,'2026-05-01').area-11.2)<1e-8);
assert(predict(points,'2026-02-15').error); // no future leakage
assert(predict(points,'2027-01-01').error); // horizon
assert(predict(points,'2026-02-30').error);
const base={id:'a',region:'aktau',before:'2026-01-01',after:'2026-02-01',water_before_km2:10,water_after_km2:11,valid_fraction:1,bbox:[1,2,3,4],polygon:{type:'Polygon',coordinates:[]},projection:'EPSG:32639',resolution_m:10,algorithm:'NDWI',threshold:0,uncertainty_km2:.2};
assert.equal(forecastSeries([{...base,valid_fraction:.99}],'aktau').length,0);
assert.equal(forecastSeries([base,{...base,id:'b',threshold:.1}],'aktau').length,2);
assert.equal(forecastSeries([base,{...base,id:'b',water_before_km2:12}],'aktau')[0].points.length,1);
assert.equal(forecastSeries([base,{...base,id:'b'}],'aktau')[0].points.length,2);
console.log('Forecast: 8 checks passed (trend, date validation, horizon, temporal leakage, coverage, compatibility, conflicts, deduplication).');
