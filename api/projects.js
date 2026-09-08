import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const file = join(process.cwd(), "api", "data", "projects.json");
    let projects = JSON.parse(readFileSync(file, "utf8"));
    const { sector, ministry, risk_category } = req.query || {};

    if (sector) {
      projects = projects.filter((p) => p.sector && p.sector.toLowerCase() === sector.toLowerCase());
    }
    if (ministry) {
      projects = projects.filter((p) => p.ministry && p.ministry.toLowerCase() === ministry.toLowerCase());
    }
    if (risk_category) {
      projects = projects.filter((p) => p.risk_category && p.risk_category.toLowerCase() === risk_category.toLowerCase());
    }

    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}