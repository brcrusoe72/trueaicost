var assert = require('assert');
var ROI = require('./roi-model.js');

var pass = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok  - ' + name); }
  catch (error) {
    console.error('  FAIL- ' + name + '\n        ' + error.message);
    process.exitCode = 1;
  }
}

console.log('TrueAICost ROI model tests\n');

test('returns finite 36-month projections', function () {
  var result = ROI.estimateROI({
    efficiencyGain: 30,
    processCost: 500000,
    employees: 20,
    aiCost: 300000
  });
  assert.strictEqual(result.optimistic.length, 36);
  assert.strictEqual(result.realistic.length, 36);
  result.optimistic.concat(result.realistic).forEach(function (value) {
    assert.ok(Number.isFinite(value));
  });
});

test('normalizes negative and non-finite values', function () {
  var result = ROI.estimateROI({
    efficiencyGain: Infinity,
    processCost: -1,
    employees: NaN,
    aiCost: '1e309'
  });
  assert.deepStrictEqual(result.inputs, {
    efficiencyGain: 0,
    processCost: 0,
    employees: 0,
    aiCost: 0
  });
  assert.strictEqual(JSON.stringify(result).includes('null'), false);
});

test('caps efficiency at 100 percent', function () {
  var result = ROI.estimateROI({ efficiencyGain: 250, processCost: 120000 });
  assert.strictEqual(result.inputs.efficiencyGain, 100);
  assert.strictEqual(result.annualSavingsPotential, 120000);
});

test('realistic projection includes delay and hidden costs', function () {
  var result = ROI.estimateROI({
    efficiencyGain: 50,
    processCost: 1000000,
    aiCost: 100000
  });
  assert.ok(result.realistic[11] < result.optimistic[11]);
  assert.strictEqual(result.trueCost, 130000);
  assert.strictEqual(result.retrainCostQuarterly, 3000);
});

console.log('\n' + pass + ' passed');
