const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request to ${path} failed with ${res.status}`);
  }
  return res.json();
}

export function getProjects(filters = {}) {
  const params = new URLSearchParams();
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.ministry) params.set("ministry", filters.ministry);
  if (filters.risk_category) params.set("risk_category", filters.risk_category);
  const qs = params.toString();
  return request(`/api/projects${qs ? `?${qs}` : ""}`);
}

export function getProject(id) {
  return request(`/api/projects/${encodeURIComponent(id)}`);
}

export function getOverview() {
  return request("/api/stats/overview");
}

export function getBySector() {
  return request("/api/stats/by-sector");
}

export function getAlerts() {
  return request("/api/alerts");
}

export function predict(body) {
  return request("/api/predict", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
