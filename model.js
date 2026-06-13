/*
 * TrueAICost — cost model
 * =======================
 *
 * This is the entire model behind the calculator. There is no backend and no
 * hidden math: every number you see in the UI comes from the constants below.
 *
 * Honesty contract (read this before trusting the output):
 *
 *   - This is an OPINIONATED ESTIMATE, not a quote and not a forecast. It exists
 *     to counter vendor quotes that only price model development, by forcing the
 *     hidden cost categories (data prep, integration, monitoring, change mgmt)
 *     onto the same page.
 *
 *   - Each parameter is tagged with a `basis`:
 *       'cited'      = a specific published figure from a named study.
 *       'calibrated' = a synthesized range informed by the cited studies, but
 *                      not a single number any one study publishes.
 *       'heuristic'  = practitioner judgment. NOT from a study. Argue with it.
 *
 *   - If you think a number is wrong, it is meant to be edited. Open an issue
 *     with a better source and it changes here, in the open.
 *
 * Runs in the browser (attaches `TrueAICostModel` to window) and in Node
 * (module.exports) so the model can be unit-tested.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TrueAICostModel = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------------------
   * Sources
   * -------------------------------------------------------------------------*/
  var SOURCES = {
    sp_global_2025: {
      label: 'S&P Global Market Intelligence (2025)',
      note: 'Enterprise AI survey. Source of the ~42% "abandoned most AI initiatives" figure.',
      url: 'https://www.spglobal.com/marketintelligence/'
    },
    rand_2024: {
      label: 'RAND RR-A2680-1 (2024)',
      note: 'Qualitative root-cause study of AI project failure (65 practitioner interviews). ' +
            'Basis for the RISK DRIVERS below. It does NOT publish a cost multiplier — anyone ' +
            'who cites RAND for a dollar figure is overreaching, including earlier versions of this site.',
      url: 'https://www.rand.org/pubs/research_reports/RRA2680-1.html'
    },
    stanford_hai_2025: {
      label: 'Stanford HAI AI Index Report (2025)',
      note: 'Adoption vs. value gap, production ROI timing, compute/inference trends.',
      url: 'https://aiindex.stanford.edu/report/'
    },
    gartner_2024: {
      label: 'Gartner AI surveys (2024)',
      note: 'POC-to-production conversion and timeline optimism. Gartner has stated ~30% of ' +
            'generative-AI projects are abandoned after PoC — the basis for the low build success rate.',
      url: 'https://www.gartner.com/en/newsroom'
    },
    mckinsey_2024: {
      label: 'McKinsey Global Survey on AI (2024)',
      note: 'Phase-level cost composition across industries.',
      url: 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai'
    },
    anaconda_2024: {
      label: 'Anaconda State of Data Science (2024)',
      note: 'Data scientists report ~38% of time on data prep & cleaning. The widely-repeated ' +
            '"80% of time on data prep" figure is folklore (CrowdFlower 2016) and is deliberately NOT used here.',
      url: 'https://www.anaconda.com/resources/whitepapers'
    },
    practitioner: {
      label: 'Practitioner heuristic (not from a study)',
      note: 'Brian Crusoe\'s judgment from building data/analytics systems on manufacturing floors. ' +
            'These are the numbers most worth arguing with.',
      url: ''
    }
  };

  /* ---------------------------------------------------------------------------
   * Parameters
   * Each entry carries its value AND its provenance so the UI can show its work.
   * -------------------------------------------------------------------------*/

  // First-year *build/implementation* cost ranges by project type, USD, before
  // any multipliers. "mid" is the planning number; low/high bound the range.
  // calibrated: order of magnitude tracks McKinsey/Gartner phase costs and public
  // pricing, but the specific brackets are synthesized, not lifted from a table.
  var BASE_COSTS = {
    chatbot:    { low: 80000,  mid: 200000,  high: 500000,  basis: 'calibrated', source: 'mckinsey_2024' },
    document:   { low: 100000, mid: 250000,  high: 600000,  basis: 'calibrated', source: 'mckinsey_2024' },
    predictive: { low: 150000, mid: 400000,  high: 900000,  basis: 'calibrated', source: 'mckinsey_2024' },
    quality:    { low: 200000, mid: 500000,  high: 1200000, basis: 'calibrated', source: 'mckinsey_2024' },
    custom:     { low: 150000, mid: 450000,  high: 1000000, basis: 'calibrated', source: 'mckinsey_2024' },
    rag:        { low: 60000,  mid: 180000,  high: 400000,  basis: 'calibrated', source: 'mckinsey_2024' }
  };

  var PROJECT_LABELS = {
    chatbot: 'Chatbot / Virtual Agent',
    document: 'Document Processing',
    predictive: 'Predictive Maintenance',
    quality: 'Quality Inspection',
    custom: 'Custom ML Model',
    rag: 'RAG / Knowledge Base'
  };

  // Scale multiplier on the build cost. Bigger orgs = more integration surface,
  // more stakeholders, more compliance. heuristic.
  var SIZE_MULT = {
    small:      { v: 0.6, basis: 'heuristic', source: 'practitioner' },
    mid:        { v: 0.85, basis: 'heuristic', source: 'practitioner' },
    midlarge:   { v: 1.0, basis: 'heuristic', source: 'practitioner' },
    large:      { v: 1.3, basis: 'heuristic', source: 'practitioner' },
    enterprise: { v: 1.8, basis: 'heuristic', source: 'practitioner' }
  };

  var SIZE_LABELS = {
    small: '1–50 employees', mid: '51–200', midlarge: '201–500',
    large: '501–2,000', enterprise: '2,000+'
  };

  // 3-year total-cost-of-ownership multiplier applied to first-year build cost.
  // The headline "vendor quote covers ~1/3 of true cost" lives here.
  // calibrated: anchored to the consistent finding (McKinsey, Gartner) that
  // run/maintain/retrain over 3 years dwarfs initial build — NOT a published 2.8x.
  var THREE_YEAR_MULT = { v: 2.8, basis: 'calibrated', source: 'gartner_2024' };

  // Data readiness penalty: messier data costs more. heuristic, +15% per step below 5.
  var DATA_READINESS_STEP = { v: 0.15, basis: 'heuristic', source: 'rand_2024' };
  // IT maturity penalty: lower maturity costs more. heuristic, +10% per step below 5.
  var IT_MATURITY_STEP = { v: 0.10, basis: 'heuristic', source: 'rand_2024' };

  // Range spread around the most-likely number. heuristic.
  var LOW_SPREAD = 0.7;   // best case = 70% of mid-derived low
  var HIGH_SPREAD = 1.2;  // worst case = 120% of mid-derived high

  // Where the 3-year money goes. Sums to 1.0. calibrated from McKinsey phase
  // splits + the Anaconda data-prep share.
  var BREAKDOWN_PCT = [
    { category: 'Data Preparation',        pct: 0.30,  basis: 'calibrated', source: 'anaconda_2024' },
    { category: 'Monitoring & Retraining', pct: 0.25,  basis: 'calibrated', source: 'mckinsey_2024' },
    { category: 'Integration & MLOps',     pct: 0.175, basis: 'calibrated', source: 'mckinsey_2024' },
    { category: 'Compute / Inference',     pct: 0.125, basis: 'calibrated', source: 'stanford_hai_2025' },
    { category: 'Model Development',       pct: 0.10,  basis: 'calibrated', source: 'mckinsey_2024' },
    { category: 'Change Management',       pct: 0.05,  basis: 'heuristic',  source: 'practitioner' }
  ];

  // What fraction of TRUE 3-year cost each vendor-quote line item actually covers.
  // Maps the "what's included" checkboxes to real coverage. heuristic, mirrors BREAKDOWN_PCT.
  var INCLUDED_COVERAGE = {
    model:       { v: 0.10,  label: 'Model development/licensing' },
    data:        { v: 0.30,  label: 'Data preparation' },
    integration: { v: 0.175, label: 'Integration engineering' },
    monitoring:  { v: 0.25,  label: 'Ongoing monitoring' },
    compute:     { v: 0.125, label: 'Compute / hosting' },
    training:    { v: 0.03,  label: 'Staff training' },
    mlops:       { v: 0.05,  label: 'MLOps / retraining' },
    change:      { v: 0.05,  label: 'Change management' }
  };

  // Production success rates by approach. calibrated to Gartner's ~30% post-PoC
  // abandonment for build, and the higher reliability of managed SaaS.
  var APPROACH = {
    build:  { successPct: 33, costFactor: 0.9, basis: 'calibrated', source: 'gartner_2024' },
    buy:    { successPct: 60, basis: 'calibrated', source: 'gartner_2024' }, // SaaS/API, priced separately
    hybrid: { successPct: 45, costFactor: 0.7, basis: 'heuristic', source: 'practitioner' }
  };
  // Monthly SaaS spend assumption for the "Buy" column, by org size. heuristic.
  var BUY_MONTHLY = { enterprise: 15000, large: 8000, _default: 4000 };

  // Realistic timelines by project type. calibrated to Gartner timeline optimism
  // (vendor timelines run ~2.5x short) + Stanford HAI ROI timing.
  var TIMELINES = {
    chatbot:    { poc: '4–6 weeks',  prod: '3–8 months',  adopt: '6–12 months',  roi: '12–24 months' },
    document:   { poc: '4–8 weeks',  prod: '4–10 months', adopt: '6–14 months',  roi: '12–24 months' },
    predictive: { poc: '6–10 weeks', prod: '8–16 months', adopt: '12–18 months', roi: '18–36 months' },
    quality:    { poc: '8–12 weeks', prod: '10–18 months',adopt: '12–24 months', roi: '24–36 months' },
    custom:     { poc: '6–10 weeks', prod: '6–14 months', adopt: '12–18 months', roi: '18–36 months' },
    rag:        { poc: '3–6 weeks',  prod: '2–6 months',  adopt: '4–10 months',  roi: '10–18 months' }
  };
  var VENDOR_TIMELINE_OPTIMISM = { v: 2.5, basis: 'cited', source: 'gartner_2024' };

  /* ---------------------------------------------------------------------------
   * Helpers
   * -------------------------------------------------------------------------*/
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function trace(assumptions, key, label, value, basis, source, note) {
    assumptions.push({ key: key, label: label, value: value, basis: basis, source: source, note: note || '' });
  }

  /* ---------------------------------------------------------------------------
   * The model
   * -------------------------------------------------------------------------*/
  function estimateAICost(raw) {
    var input = raw || {};
    var projectType = BASE_COSTS[input.projectType] ? input.projectType : 'custom';
    var companySize = SIZE_MULT[input.companySize] ? input.companySize : 'mid';
    var itMaturity = clamp(Number(input.itMaturity) || 3, 1, 5);
    var dataReadiness = clamp(Number(input.dataReadiness) || 2, 1, 5);
    var vendorQuote = Math.max(0, Number(input.vendorQuote) || 0);
    var vendorTimeline = Math.max(0, Number(input.vendorTimeline) || 0);
    var included = Array.isArray(input.included) ? input.included : [];

    var assumptions = [];
    var usedSources = {};
    function useSource(k) { if (SOURCES[k]) usedSources[k] = SOURCES[k]; }

    var base = BASE_COSTS[projectType];
    var size = SIZE_MULT[companySize];
    useSource(base.source); useSource(size.source);

    trace(assumptions, 'base', 'Base build cost (' + PROJECT_LABELS[projectType] + ', most-likely)',
      '$' + base.mid.toLocaleString(), base.basis, base.source);
    trace(assumptions, 'size', 'Company-scale multiplier (' + SIZE_LABELS[companySize] + ')',
      '×' + size.v, size.basis, size.source);

    // Multipliers
    var dataMult = 1 + (5 - dataReadiness) * DATA_READINESS_STEP.v;
    var itMult = 1 + (5 - itMaturity) * IT_MATURITY_STEP.v;
    useSource(DATA_READINESS_STEP.source); useSource(IT_MATURITY_STEP.source);
    trace(assumptions, 'data', 'Data-readiness penalty (' + dataReadiness + '/5)',
      '×' + dataMult.toFixed(2) + ' (+' + (DATA_READINESS_STEP.v * 100) + '% per step below 5)',
      DATA_READINESS_STEP.basis, DATA_READINESS_STEP.source);
    trace(assumptions, 'it', 'IT-maturity penalty (' + itMaturity + '/5)',
      '×' + itMult.toFixed(2) + ' (+' + (IT_MATURITY_STEP.v * 100) + '% per step below 5)',
      IT_MATURITY_STEP.basis, IT_MATURITY_STEP.source);

    useSource(THREE_YEAR_MULT.source);
    trace(assumptions, '3yr', '3-year TCO multiplier (run + maintain + retrain)',
      '×' + THREE_YEAR_MULT.v, THREE_YEAR_MULT.basis, THREE_YEAR_MULT.source,
      'This is the core claim: a vendor quote that only prices build covers roughly 1/' +
      THREE_YEAR_MULT.v.toFixed(1) + ' of the 3-year reality.');

    var common = size.v * dataMult * itMult * THREE_YEAR_MULT.v;
    var costLow = Math.round(base.low * common * LOW_SPREAD);
    var costMid = Math.round(base.mid * common);
    var costHigh = Math.round(base.high * common * HIGH_SPREAD);

    // Cost breakdown
    var breakdown = BREAKDOWN_PCT.map(function (b) {
      useSource(b.source);
      return { category: b.category, pct: b.pct, amount: Math.round(costMid * b.pct),
               basis: b.basis, source: b.source };
    });

    // Build vs Buy vs Hybrid
    var buyMonthly = BUY_MONTHLY[companySize] || BUY_MONTHLY._default;
    useSource(APPROACH.build.source); useSource(APPROACH.hybrid.source);
    var buildBuyHybrid = {
      build:  { cost: Math.round(costMid * APPROACH.build.costFactor), successPct: APPROACH.build.successPct },
      buy:    { cost: buyMonthly * 36, successPct: APPROACH.buy.successPct, monthly: buyMonthly },
      hybrid: { cost: Math.round(costMid * APPROACH.hybrid.costFactor), successPct: APPROACH.hybrid.successPct }
    };

    // Risk score (0–100, higher = riskier). heuristic, drivers grounded in RAND.
    useSource('rand_2024');
    var riskDrivers = [];
    var risk = 50;
    var dataRisk = (5 - dataReadiness) * 8; risk += dataRisk;
    if (dataRisk) riskDrivers.push({ label: 'Data readiness ' + dataReadiness + '/5', delta: dataRisk });
    var itRisk = (5 - itMaturity) * 6; risk += itRisk;
    if (itRisk) riskDrivers.push({ label: 'IT maturity ' + itMaturity + '/5', delta: itRisk });
    if (projectType === 'quality' || projectType === 'predictive') {
      risk += 10; riskDrivers.push({ label: 'High-complexity project type', delta: 10 });
    }
    if (companySize === 'small') {
      risk += 8; riskDrivers.push({ label: 'Small org (thin specialist bench)', delta: 8 });
    }
    risk = clamp(risk, 10, 95);
    var riskLabel = risk < 40 ? 'Low Risk' : risk < 70 ? 'Moderate Risk' : 'High Risk';

    // Success probability (chance of reaching production). calibrated to Gartner.
    useSource('gartner_2024');
    var successDrivers = [];
    var success = 33;
    successDrivers.push({ label: 'Base build success rate', delta: 33 });
    var itGain = (itMaturity - 1) * 4; success += itGain;
    if (itGain) successDrivers.push({ label: 'IT maturity', delta: itGain });
    var dataGain = (dataReadiness - 1) * 5; success += dataGain;
    if (dataGain) successDrivers.push({ label: 'Data readiness', delta: dataGain });
    if (companySize === 'enterprise') { success += 8; successDrivers.push({ label: 'Enterprise resources', delta: 8 }); }
    if (projectType === 'rag' || projectType === 'chatbot') {
      success += 10; successDrivers.push({ label: 'Lower-complexity project type', delta: 10 });
    }
    success = clamp(success, 15, 72);

    // Timeline
    var timeline = TIMELINES[projectType] || TIMELINES.custom;
    useSource(VENDOR_TIMELINE_OPTIMISM.source);

    // Vendor quote gap — honest version.
    // Two distinct, separately-labelled facts (the old code computed scope coverage
    // then silently displayed the dollar ratio instead; both are shown now).
    var vendorGap = null;
    if (vendorQuote > 0) {
      var scopeCoveredPct = 0;
      var coveredItems = [];
      included.forEach(function (item) {
        var c = INCLUDED_COVERAGE[item];
        if (c) { scopeCoveredPct += c.v; coveredItems.push(c.label); }
      });
      scopeCoveredPct = Math.min(scopeCoveredPct, 1);
      var quoteVsTrue = clamp(Math.round((vendorQuote / costMid) * 100), 0, 100);
      vendorGap = {
        quote: vendorQuote,
        quoteVsTruePct: quoteVsTrue,              // dollar quote as % of most-likely true cost
        scopeCoveredPct: Math.round(scopeCoveredPct * 100), // % of real cost categories the quote claims
        coveredItems: coveredItems,
        gap: Math.max(0, costMid - vendorQuote),
        vendorTimeline: vendorTimeline,
        realisticTimelineMonths: vendorTimeline > 0
          ? Math.round(vendorTimeline * VENDOR_TIMELINE_OPTIMISM.v) : 0
      };
    }

    return {
      inputs: { projectType: projectType, projectLabel: PROJECT_LABELS[projectType],
                companySize: companySize, itMaturity: itMaturity, dataReadiness: dataReadiness },
      tco: { low: costLow, mid: costMid, high: costHigh },
      breakdown: breakdown,
      buildBuyHybrid: buildBuyHybrid,
      risk: { score: risk, label: riskLabel, drivers: riskDrivers },
      success: { pct: success, drivers: successDrivers },
      timeline: timeline,
      vendorGap: vendorGap,
      assumptions: assumptions,
      sources: usedSources
    };
  }

  return {
    estimateAICost: estimateAICost,
    SOURCES: SOURCES,
    BASE_COSTS: BASE_COSTS,
    BREAKDOWN_PCT: BREAKDOWN_PCT,
    PROJECT_LABELS: PROJECT_LABELS,
    INCLUDED_COVERAGE: INCLUDED_COVERAGE,
    THREE_YEAR_MULT: THREE_YEAR_MULT
  };
});
