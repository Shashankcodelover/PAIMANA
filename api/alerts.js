import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const file = join(process.cwd(), "api", "data", "projects.json");
    const projects = JSON.parse(readFileSync(file, "utf8"));
    const alerts = projects
      .filter((p) => p.risk_category === "Critical" || p.risk_category === "High")
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    res.status(200).json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}