import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const file = join(process.cwd(), "api", "data", "projects.json");
    const projects = JSON.parse(readFileSync(file, "utf8"));

    const sectorMap = {};
    for (const p of projects) {
      const s = p.sector || "Unknown";
      if (!sectorMap[s]) {
        sectorMap[s] = {
          sector: s,
          project_count: 0,
          total_original_cost_cr: 0,
          total_revised_cost_cr: 0,
          overruns: [],
          scores: [],
        };
      }
      sectorMap[s].project_count++;
      sectorMap[s].total_original_cost_cr += p.original_cost_cr || 0;
      sectorMap[s].total_revised_cost_cr += p.revised_cost_cr || 0;
      sectorMap[s].overruns.push(p.cost_overrun_pct || 0);
      sectorMap[s].scores.push(p.risk_score || 0);
    }

    const list = Object.values(sectorMap).map((item) => {
      const avgOverrun = item.overruns.reduce((a, b) => a + b, 0) / (item.overruns.length || 1);
      const avgScore = item.scores.reduce((a, b) => a + b, 0) / (item.scores.length || 1);
      return {
        sector: item.sector,
        project_count: item.project_count,
        total_original_cost_cr: Math.round(item.total_original_cost_cr * 100) / 100,
        total_revised_cost_cr: Math.round(item.total_revised_cost_cr * 100) / 100,
        avg_cost_overrun_pct: Math.round(avgOverrun * 100) / 100,
        mean_cost_overrun_pct: Math.round(avgOverrun * 100) / 100,
        mean_risk_score: Math.round(avgScore * 10) / 10,
      };
    });

    list.sort((a, b) => b.mean_risk_score - a.mean_risk_score);
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}