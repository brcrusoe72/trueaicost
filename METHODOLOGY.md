# Methodology

Every number the calculator produces comes from [`model.js`](./model.js). This document
explains where each one comes from, how confident you should be in it, and — importantly
— what the cited sources do **not** say. If you only read one section, read
[Limitations](#limitations).

## How a number is computed

The 3-year total cost of ownership is:

```
TCO_mid = BASE_COST[projectType].mid
        × SIZE_MULT[companySize]
        × dataReadinessPenalty      (1 + (5 − dataReadiness) × 0.15)
        × itMaturityPenalty         (1 + (5 − itMaturity)    × 0.10)
        × THREE_YEAR_MULT           (2.8)

TCO_low  = BASE_COST.low  × (same multipliers) × 0.7
TCO_high = BASE_COST.high × (same multipliers) × 1.2
```

The calculator's **"How this estimate was calculated"** panel renders this exact chain
for your inputs, with each step's `basis` label.

## Basis labels

| basis | meaning | trust |
|-------|---------|-------|
| `cited` | A specific published figure from a named study. | High — go read the source. |
| `calibrated` | A synthesized range whose order of magnitude tracks the studies, but which no single study publishes as one number. | Medium — directionally grounded, specifics are ours. |
| `heuristic` | Practitioner judgment. Not from any study. | Low — this is an opinion. Argue with it. |

## Parameter-by-parameter

### Base build costs (`BASE_COSTS`) — *calibrated*
First-year implementation cost by project type, before multipliers. The brackets
(e.g. RAG $60K–$400K, quality inspection $200K–$1.2M) track the order of magnitude of
McKinsey/Gartner phase costs and public platform pricing, but the specific numbers are
synthesized. **Not** lifted from any single published table.

### Company-scale multiplier (`SIZE_MULT`) — *heuristic*
0.6× (1–50 employees) to 1.8× (2,000+). Larger orgs carry more integration surface,
more stakeholders, and more compliance. This is judgment, not a measured curve.

### 3-year TCO multiplier (`THREE_YEAR_MULT = 2.8`) — *calibrated / heuristic*
The core claim. Anchored to the repeated finding (McKinsey, Gartner) that run +
maintain + retrain over three years dwarfs the initial build, so a build-only quote
covers roughly 1/2.8 ≈ 36% of reality. **This is not a published "2.8×" statistic.**
Simple single-system projects trend toward 2.0×; heavily regulated builds (SR 11-7,
FDA SaMD) routinely exceed 4×.

### Data-readiness & IT-maturity penalties — *heuristic*
+15% per step of data un-readiness below 5; +10% per step of IT immaturity below 5.
The *direction* is well supported by RAND's failure root-causes (data and integration
readiness dominate failures); the *coefficients* are ours.

### Cost-category split (`BREAKDOWN_PCT`) — *calibrated*
Data Prep 30% · Monitoring & Retraining 25% · Integration & MLOps 17.5% ·
Compute/Inference 12.5% · Model Development 10% · Change Management 5%. Sums to 100%
(enforced by a test). Calibrated to McKinsey phase composition plus the Anaconda
data-prep share.

### Build / Buy / Hybrid success rates — *calibrated / heuristic*
Build ~33% reaching production is calibrated to Gartner's stated ~30% post-PoC
abandonment for generative-AI projects. Buy (~60%) reflects higher managed-SaaS
reliability. Hybrid (~45%) is a heuristic midpoint.

### Risk & success scores — *heuristic, drivers grounded in RAND*
Both are bounded point systems (risk 10–95, success 15–72). The *drivers* — data
readiness, IT maturity, project complexity, org size — are the failure factors RAND
identifies. The *weights* are judgment. Treat these as a relative signal, not a
calibrated probability.

### Timelines & the 2.5× optimism factor (`VENDOR_TIMELINE_OPTIMISM`) — *cited*
Gartner has reported vendor/internal AI timelines running materially short; we apply a
2.5× factor to a quoted timeline. The per-project-type ranges are calibrated to that
plus Stanford HAI ROI timing.

### Vendor-quote gap — *derived*
Given a quote and the line items it includes, the model reports **two separate facts**:
1. the quote as a % of the most-likely true cost (dollar ratio), and
2. the % of real cost *categories* the quote claims to scope (from the checkboxes).

> Note: earlier versions of this site computed the scope coverage and then silently
> displayed the dollar ratio under the "coverage" label — the checkboxes had no effect.
> That bug is fixed and pinned by a regression test in `model.test.js`.

## Sources

- **RAND RR-A2680-1** (2024), *The Root Causes of Failure for AI Projects* — qualitative,
  65 interviews. Informs the **risk model**. Publishes **no cost multiplier**; citing it
  for a dollar figure is overreaching (this site used to).
- **S&P Global Market Intelligence — VotE: AI & ML 2025** — survey of 1,006 IT/line-of-business
  professionals (NA + Europe), May 2025. Source of the abandonment figures: orgs abandoning most AI
  initiatives before production rose **17% → 42%** YoY; **~46%** of projects scrapped between PoC and
  broad adoption. ([source](https://www.spglobal.com/market-intelligence/en/news-insights/research/ai-experiences-rapid-adoption-but-with-mixed-outcomes-highlights-from-vote-ai-machine-learning))
- **Stanford HAI AI Index 2025** — ROI timing, adoption-vs-value gap, compute trends.
- **Gartner** (July 2024 press release) — *predicted* ≥30% of generative-AI projects abandoned after
  proof of concept by end of 2025 (a forecast); timeline optimism.
- **McKinsey Global Survey on AI** (2024) — phase-level cost composition.
- **Data-prep share** — data preparation is consistently the single largest time/cost category in
  practitioner surveys, well above model-building. The popular "80% of time on data prep" figure is
  unsourced folklore (CrowdFlower, ~2016) and is **not used**. The 30% data-prep cost share in the
  model is a calibrated estimate, not a cited statistic.

## Limitations

- It's a **parametric heuristic**, not a model fit to a dataset of real project outcomes.
  With enough anonymized real project costs, the constants could be replaced with a
  regression. They aren't — yet.
- Costs are **US-centric** and not inflation-adjusted beyond the source years.
- Industry selection currently doesn't change the math (it's collected for future
  calibration); regulated-industry multipliers live in the benchmarks page, not the
  calculator. This is a known gap.
- The vendor scorecard (`vendors.html`) is **opinionated** and based on public pricing,
  user reviews, and practitioner judgment — not audited financials.

Found something wrong? [Open an issue.](https://github.com/brcrusoe72/trueaicost/issues)
