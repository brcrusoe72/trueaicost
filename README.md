# TrueAICost

**An open, opinionated model for the true 3-year cost of an AI project.**

A vendor quote usually prices the *build* — which is roughly a third of what an AI
project actually costs over three years. The rest (data prep, integration, monitoring,
retraining, compute, change management) shows up later, after the PO is signed.
TrueAICost puts the whole picture on one page *before* you sign — and shows its work.

🔗 **Live:** https://trueaicost.com
📐 **The entire model:** [`model.js`](./model.js) — one readable file, no backend.

---

## Why this exists

Most "AI cost calculators" are lead-gen forms that email you a number with no math
behind it. This one is the opposite:

- **No backend, no database, no tracking.** The calculation runs in your browser.
- **No email gate, no signup, nothing for sale.** It's a side project, not a funnel.
- **No vendor pays for placement** and no platform on the comparison earns a
  commission. A "true cost" site funded by the vendors it scores would be a contradiction.
- **Every number is labeled** by how much you should trust it (see below).

It was built by [Brian Crusoe](https://linkedin.com/in/briancrusoe), who spent 8+ years
building data and analytics systems on food & CPG manufacturing floors and watched AI
projects get scoped against build-only quotes and then balloon.

## The honesty contract

This is an **estimate**, not a quote and not a forecast. Every parameter in
[`model.js`](./model.js) carries a `basis` tag, and the calculator shows it for your
specific result:

| basis | meaning |
|-------|---------|
| **cited** | A specific published figure from a named study. |
| **calibrated** | A synthesized range informed by the studies, but not a single number any one of them publishes. |
| **heuristic** | Practitioner judgment. *Not* from a study. The numbers most worth arguing with. |

The headline "~2.8× overrun" is a **heuristic**, not a published statistic — see
[METHODOLOGY.md](./METHODOLOGY.md) for exactly where every number comes from, including
what the sources do *not* say.

## What's in here

```
index.html        Landing page + methodology
calculator.html   4-step calculator (the main thing)
model.js          The whole cost model — open, documented, unit-tested
model.test.js     Plain-Node tests (no test runner needed)
benchmarks.html   Cost benchmark tables by industry / project type / size
vendors.html      Vendor scorecard (opinionated; methodology stated on-page)
roi.html          ROI reality-check tool
resources.html    Curated reading + checklists
styles.css        Styles
shared.js         Shared nav/footer injection
```

## Run it locally

It's static files — no build step.

```bash
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

## Run the model tests

```bash
node model.test.js
```

No dependencies. The tests assert the invariants that matter: TCO ordering, that
messier data costs more, that the cost-category split sums to 100%, that risk/success
stay in bounds, and that the vendor-quote line items actually affect the output.

## Disagree with a number?

Good — that's the point. The model is one file. Change a constant, re-run the tests,
and [open a PR](https://github.com/brcrusoe72/trueaicost/pulls) or an
[issue](https://github.com/brcrusoe72/trueaicost/issues) with a better source.

## License

[MIT](./LICENSE). The cost model, in particular, is meant to be copied, audited, and
improved.

---

*Not financial, legal, or professional advice. Estimates only.*
