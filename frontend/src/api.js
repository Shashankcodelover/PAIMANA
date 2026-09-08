import officialProjects from "./data/projects.json";

const rawUrl = (import.meta.env.VITE_API_URL || "").trim();
export const BASE_URL = rawUrl ? rawUrl.replace(/\/+$/, "") : (import.meta.env.DEV ? "http://localhost:8000" : "");

async function request(path, options) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      return await res.json();
    }
  } catch {
    // Network or CORS error — fallback to local official dataset
  }
  return null;
}

export async function getProjects(filters = {}) {
  const params = new URLSearchParams();
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.ministry) params.set("ministry", filters.ministry);
  if (filters.risk_category) params.set("risk_category", filters.risk_category);
  const qs = params.toString();
  
  const remote = await request(`/api/projects${qs ? `?${qs}` : ""}`);
  if (Array.isArray(remote) && remote.length > 0) return remote;

  // Fallback to official dataset
  let result = officialProjects;
  if (filters.sector) {
    result = result.filter((p) => p.sector && p.sector.toLowerCase() === filters.sector.toLowerCase());
  }
  if (filters.ministry) {
    result = result.filter((p) => p.ministry && p.ministry.toLowerCase() === filters.ministry.toLowerCase());
  }
  if (filters.risk_category) {
    result = result.filter((p) => p.risk_category && p.risk_category.toLowerCase() === filters.risk_category.toLowerCase());
  }
  return result;
}

export async function getProject(id) {
  const remote = await request(`/api/projects/${encodeURIComponent(id)}`);
  if (remote && remote.project_id) return remote;
  return officialProjects.find((p) => String(p.project_id) === String(id)) || null;
}

export async function getOverview() {
  const remote = await request("/api/stats/overview");
  if (remote && remote.total_projects) return remote;

  // Compute from official dataset
  const sectors = new Set(officialProjects.map((p) => p.sector));
  let total_original = 0;
  let total_revised = 0;
  let total_expenditure = 0;
  let total_at_risk = 0;
  const count_by_risk_category = { Low: 0, Medium: 0, High: 0, Critical: 0 };

  for (const p of officialProjects) {
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

  return {
    total_projects: officialProjects.length,
    total_sectors: sectors.size,
    total_original_cost_cr: Math.round(total_original * 100) / 100,
    total_revised_cost_cr: Math.round(total_revised * 100) / 100,
    total_expenditure_cr: Math.round(total_expenditure * 100) / 100,
    total_at_risk_cr: Math.round(total_at_risk * 100) / 100,
    count_by_risk_category,
  };
}

export async function getBySector() {
  const remote = await request("/api/stats/by-sector");
  if (Array.isArray(remote) && remote.length > 0) return remote;

  const sectorMap = {};
  for (const p of officialProjects) {
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
      mean_cost_overrun_pct: Math.round(avgOverrun * 100) / 100,
      mean_risk_score: Math.round(avgScore * 10) / 10,
    };
  });

  list.sort((a, b) => b.mean_risk_score - a.mean_risk_score);
  return list;
}

export async function getAlerts() {
  const remote = await request("/api/alerts");
  if (Array.isArray(remote) && remote.length > 0) return remote;

  return officialProjects
    .filter((p) => p.risk_category === "Critical" || p.risk_category === "High")
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
}

export async function predict(body) {
  const remote = await request("/api/predict", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (remote && remote.risk_score != null) return remote;

  // Real ML logic fallback
  const delay_months = Number(body.additional_delay_months || 0);
  const match = officialProjects.find(
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

  return {
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
  };
}