import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const file = join(process.cwd(), "api", "data", "projects.json");
    const projects = JSON.parse(readFileSync(file, "utf8"));

    const sectors = new Set(projects.map((p) => p.sector));
    let total_original = 0;
    let total_revised = 0;
    let total_expenditure = 0;
    let total_at_risk = 0;
    const count_by_risk_category = { Low: 0, Medium: 0, High: 0, Critical: 0 };

    for (const p of projects) {
      total_original += p.original_cost_cr || 0;
      total_revised += p.revised_cost_cr || 0;
      total_expenditure += p.expenditure_cr || 0;
      if (p.cost_overrun_pct > 0) {
        total_at_risk += Math.max(0, (p.revised_cost_cr || 0) - (p.original_cost_cr || 0));
      }
      if (p.risk_category && count_by_risk_category[p.risk_category] !== undefined) {
        count_by_risk_category[p.risk_category]++;
      }
    }

    res.status(200).json({
      total_projects: projects.length,
      total_sectors: sectors.size,
      total_original_cost_cr: Math.round(total_original * 100) / 100,
      total_revised_cost_cr: Math.round(total_revised * 100) / 100,
      total_expenditure_cr: Math.round(total_expenditure * 100) / 100,
      total_at_risk_cr: Math.round(total_at_risk * 100) / 100,
      count_by_risk_category,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}