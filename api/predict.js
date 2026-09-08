import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const delay_months = Number(body.additional_delay_months || 0);

    const file = join(process.cwd(), "api", "data", "projects.json");
    const projects = JSON.parse(readFileSync(file, "utf8"));

    const match = projects.find(
      (p) => p.sector && body.sector && p.sector.toLowerCase() === body.sector.toLowerCase()
    );
    const baseOverrun = match ? match.predicted_cost_overrun_pct || match.cost_overrun_pct || 15 : 15;

    let risk_score = Math.min(100, Math.max(0, 10 + baseOverrun * 0.9));
    let predicted_time_overrun_days = Math.max(0, Math.round(baseOverrun * 6));

    if (delay_months) {
      predicted_time_overrun_days += delay_months * 30;
      const bump = Math.min(30, delay_months * 2.5);
      risk_score = Math.min(100, Math.round((risk_score + bump) * 10) / 10);
    }

    let risk_category = "Low";
    if (risk_score >= 55) risk_category = "Critical";
    else if (risk_score >= 32.5) risk_category = "High";
    else if (risk_score >= 19) risk_category = "Medium";

    res.status(200).json({
      original_cost_cr: Number(body.original_cost_cr || 0),
      sector: body.sector || "Unknown",
      ministry: body.ministry || "Unknown",
      physical_progress_pct: body.physical_progress_pct != null ? Number(body.physical_progress_pct) : null,
      additional_delay_months: delay_months,
      cost_overrun_pct: Math.round(baseOverrun * 100) / 100,
      predicted_cost_overrun_pct: Math.round(baseOverrun * 100) / 100,
      predicted_time_overrun_days,
      risk_score,
      risk_category,
      top_risk_factors: [
        `Large original budget (Rs. ${Math.round(body.original_cost_cr || 0).toLocaleString()} cr) raises exposure`,
        `${body.sector || "Sector"} sector has historically tracked delivery patterns`,
        `${body.ministry || "Ministry"} projects tracked under infrastructure portfolio`
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}