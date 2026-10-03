/*
 * TrueAICost — ROI model
 * Pure calculation module shared by the browser page and dependency-free tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TrueAICostROI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function finiteNonnegative(value) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function estimateROI(raw) {
    var input = raw || {};
    var efficiencyPct = clamp(finiteNonnegative(input.efficiencyGain), 0, 100);
    var processCost = finiteNonnegative(input.processCost);
    var employees = Math.floor(finiteNonnegative(input.employees));
    var aiCost = finiteNonnegative(input.aiCost);
    var annualSavingsPotential = processCost * (efficiencyPct / 100);
    var monthlySavingsFull = annualSavingsPotential / 12;

    var implementationMonthsOptimistic = 3;
    var implementationMonthsRealistic = Math.round(implementationMonthsOptimistic * 2.5);
    var rampMonths = 6;
    var adoptionHalflife = 8;
    var retrainCostQuarterly = aiCost * 0.03;
    var trueCost = aiCost * 1.3;

    var optimistic = [];
    var optimisticTotal = -aiCost;
    var realistic = [];
    var realisticTotal = -trueCost;

    for (var month = 1; month <= 36; month++) {
      if (month > implementationMonthsOptimistic) {
        optimisticTotal += monthlySavingsFull;
      }
      optimistic.push(optimisticTotal);

      if (month > implementationMonthsRealistic && month % 3 === 0) {
        realisticTotal -= retrainCostQuarterly;
      }
      if (month > implementationMonthsRealistic) {
        var monthsSinceLaunch = month - implementationMonthsRealistic;
        var accuracyFactor = Math.min(1, 0.5 + 0.5 * (monthsSinceLaunch / rampMonths));
        var adoptionFactor = 1 / (1 + Math.exp(-(monthsSinceLaunch - adoptionHalflife) / 2.5));
        realisticTotal += monthlySavingsFull * accuracyFactor * adoptionFactor;
      }
      realistic.push(realisticTotal);
    }

    return {
      inputs: {
        efficiencyGain: efficiencyPct,
        processCost: processCost,
        employees: employees,
        aiCost: aiCost
      },
      annualSavingsPotential: annualSavingsPotential,
      optimistic: optimistic,
      realistic: realistic,
      optimisticBreakeven: optimistic.findIndex(function (value) { return value >= 0; }) + 1,
      realisticBreakeven: realistic.findIndex(function (value) { return value >= 0; }) + 1,
      implementationMonthsOptimistic: implementationMonthsOptimistic,
      implementationMonthsRealistic: implementationMonthsRealistic,
      rampMonths: rampMonths,
      adoptionHalflife: adoptionHalflife,
      retrainCostQuarterly: retrainCostQuarterly,
      trueCost: trueCost
    };
  }

  return {
    estimateROI: estimateROI,
    finiteNonnegative: finiteNonnegative
  };
});
