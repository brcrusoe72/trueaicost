/*
 * Model invariants. Run: node model.test.js
 * No deps — plain assertions so anyone can audit the math without a test runner.
 */
var assert = require('assert');
var M = require('./model.js');

var pass = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok  - ' + name); }
  catch (e) { console.error('  FAIL- ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

console.log('TrueAICost model tests\n');

test('returns a full result shape for a minimal input', function () {
  var r = M.estimateAICost({ projectType: 'rag', companySize: 'mid' });
  ['tco', 'breakdown', 'buildBuyHybrid', 'risk', 'success', 'timeline', 'assumptions', 'sources'].forEach(function (k) {
    assert.ok(r[k] !== undefined, 'missing key: ' + k);
  });
});

test('TCO is ordered low <= mid <= high and positive', function () {
  var r = M.estimateAICost({ projectType: 'quality', companySize: 'large', itMaturity: 3, dataReadiness: 2 });
  assert.ok(r.tco.low > 0, 'low must be positive');
  assert.ok(r.tco.low <= r.tco.mid, 'low <= mid');
  assert.ok(r.tco.mid <= r.tco.high, 'mid <= high');
});

test('messier data costs strictly more than clean data', function () {
  var messy = M.estimateAICost({ projectType: 'custom', companySize: 'mid', dataReadiness: 1, itMaturity: 3 });
  var clean = M.estimateAICost({ projectType: 'custom', companySize: 'mid', dataReadiness: 5, itMaturity: 3 });
  assert.ok(messy.tco.mid > clean.tco.mid, 'low data readiness should raise cost');
});

test('breakdown percentages sum to 1.0 and amounts to ~mid', function () {
  var r = M.estimateAICost({ projectType: 'predictive', companySize: 'midlarge' });
  var pctSum = r.breakdown.reduce(function (s, b) { return s + b.pct; }, 0);
  assert.ok(Math.abs(pctSum - 1) < 1e-9, 'pct sum = ' + pctSum);
  var amtSum = r.breakdown.reduce(function (s, b) { return s + b.amount; }, 0);
  assert.ok(Math.abs(amtSum - r.tco.mid) <= r.breakdown.length, 'amounts should sum to ~mid (rounding)');
});

test('risk and success stay within declared bounds', function () {
  // worst-case inputs
  var worst = M.estimateAICost({ projectType: 'quality', companySize: 'small', itMaturity: 1, dataReadiness: 1 });
  assert.ok(worst.risk.score >= 10 && worst.risk.score <= 95, 'risk in [10,95]');
  assert.ok(worst.success.pct >= 15 && worst.success.pct <= 72, 'success in [15,72]');
  // best-case inputs
  var best = M.estimateAICost({ projectType: 'rag', companySize: 'enterprise', itMaturity: 5, dataReadiness: 5 });
  assert.ok(best.risk.score < worst.risk.score, 'better inputs => lower risk');
  assert.ok(best.success.pct > worst.success.pct, 'better inputs => higher success');
});

test('vendor gap is null without a quote, populated with one', function () {
  var none = M.estimateAICost({ projectType: 'chatbot', companySize: 'mid' });
  assert.strictEqual(none.vendorGap, null, 'no quote => null gap');
  var withQuote = M.estimateAICost({ projectType: 'chatbot', companySize: 'mid', vendorQuote: 150000, included: ['model', 'data'] });
  assert.ok(withQuote.vendorGap, 'quote => gap object');
  assert.ok(withQuote.vendorGap.scopeCoveredPct > 0, 'checked items must affect scope coverage (the old bug)');
  assert.strictEqual(withQuote.vendorGap.scopeCoveredPct, 40, 'model(10)+data(30) = 40% scope coverage');
});

test('every assumption carries a real source and basis', function () {
  var r = M.estimateAICost({ projectType: 'document', companySize: 'large', vendorQuote: 50000 });
  var valid = { cited: 1, calibrated: 1, heuristic: 1 };
  r.assumptions.forEach(function (a) {
    assert.ok(valid[a.basis], 'bad basis: ' + a.basis);
    assert.ok(M.SOURCES[a.source], 'assumption references unknown source: ' + a.source);
  });
});

test('unknown project type falls back to custom, never throws', function () {
  var r = M.estimateAICost({ projectType: 'nonsense', companySize: 'zzz', itMaturity: 99, dataReadiness: -4 });
  assert.strictEqual(r.inputs.projectType, 'custom');
  assert.ok(r.tco.mid > 0);
});

console.log('\n' + pass + ' passed');
