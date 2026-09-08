import { useMemo, useState } from "react";

const CHIPS = ["All", "Low", "Medium", "High", "Critical"];

function riskClass(category) {
  return (category || "").toLowerCase();
}

function formatCr(value) {
  return `₹${Math.round(value).toLocaleString("en-IN")} cr`;
}

export default function ProjectTable({ projects, onSelect }) {
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState("All");

  const filtered = useMemo(() => {
    let rows = projects || [];
    if (activeChip !== "All") {
      rows = rows.filter((p) => p.risk_category === activeChip);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((p) => p.project_name.toLowerCase().includes(q));
    }
    return rows;
  }, [projects, query, activeChip]);

  return (
    <div>
      <div className="table-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search projects by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-chips">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              className={`filter-chip ${activeChip === chip ? "active" : ""}`}
              onClick={() => setActiveChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="project-table-wrap">
        <table className="project-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Sector</th>
              <th>Risk</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">No projects match this search and filter.</div>
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.project_id} onClick={() => onSelect(p.project_id)}>
                <td className="project-name-cell">{p.project_name}</td>
                <td className="project-sector-cell">{p.sector}</td>
                <td>
                  <span className={`risk-badge ${riskClass(p.risk_category)}`}>
                    {p.risk_category}
                  </span>
                </td>
                <td className="cost-cell tabular">
                  {formatCr(p.original_cost_cr)}
                  <span className="cost-arrow">→</span>
                  {formatCr(p.revised_cost_cr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
