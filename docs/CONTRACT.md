# PAIMANA Risk Watch — Data Contract

Every project record, everywhere in the system (CSV row, API response, frontend prop), uses this
**exact** shape. Nothing downstream should invent field names that aren't here.

```json
{
  "project_id": "string",
  "project_name": "string",
  "ministry": "string",
  "sector": "string",
  "original_cost_cr": "number",
  "revised_cost_cr": "number",
  "expenditure_cr": "number",
  "physical_progress_pct": "number (0-100)",
  "status": "On Track | Delayed | Critical | Completed",
  "cost_overrun_pct": "number",
  "predicted_cost_overrun_pct": "number",
  "predicted_time_overrun_days": "number",
  "risk_score": "number (0-100)",
  "risk_category": "Low | Medium | High | Critical",
  "top_risk_factors": ["string", "string", "string"],
  "revised_cost_missing": "boolean",
  "possible_outlier": "boolean",
  "date_is_synthetic": "boolean"
}
```

## Field notes

- `cost_overrun_pct` — actual/reported overrun, computed as
  `(revised_cost_cr - original_cost_cr) / original_cost_cr * 100`.
- `predicted_cost_overrun_pct` / `predicted_time_overrun_days` / `risk_score` / `risk_category` /
  `top_risk_factors` — all come from `ml/predictor.py`'s `predict_risk()`, cached at backend startup.
  These are never hand-set or randomly generated.
- `revised_cost_missing` — true when a project has no reported revised cost yet (the revised cost was
  backfilled with the original cost as a "no reported overrun yet" placeholder).
- `possible_outlier` — true when `cost_overrun_pct` exceeds 500%. Flagged, never dropped.
- `date_is_synthetic` — true when a row's date fields were generated as placeholders rather than
  sourced from a report.
- An internal-only QA column, `cost_is_estimated`, may additionally appear in the raw/clean CSVs (not
  the API schema) when a cost figure was generated rather than sourced from a real report. See
  `README.md` → "Assumptions Made".

## Rules

1. Every layer (CSV → API → frontend) reads/writes these exact field names. No renaming, no aliases.
2. Every prediction field must be produced by an actually-trained model on actually-loaded data — never
   hardcoded or random.
3. Any synthetic or estimated value carries its own boolean flag column, always. Nothing is silently
   fabricated.
