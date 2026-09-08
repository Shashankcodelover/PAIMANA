import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const file = join(process.cwd(), "api", "data", "benchmarking.json");
    const data = JSON.parse(readFileSync(file, "utf8"));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
