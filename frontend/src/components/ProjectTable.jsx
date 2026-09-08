import { useMemo, useState, useEffect } from "react";

const CHIPS = ["All", "Low", "Medium", "High", "Critical"];
const PAGE_SIZE = 25;

function riskClass(category) {
  return (category || "").toLowerCase();
}

function formatCr(value) {
  if (value === null || value === undefined) return "₹0 cr";
  return `₹${Math.round(value).toLocaleString("en-IN")} cr`;
}

export default function ProjectTable({ projects = [], onSelect }) {
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const [selectedSector, setSelectedSector] = useState("All");
  const [page, setPage] = useState(1);

  // Extract unique sectors
  const sectorList = useMemo(() => {
    const s = new Set((projects || []).map((p) => p.sector).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [projects]);

  // Filter projects
  const filtered = useMemo(() => {
    let rows = projects || [];
    if (activeChip !== "All") {
      rows = rows.filter((p) => p.risk_category === activeChip);
    }
    if (selectedSector !== "All") {
      rows = rows.filter((p) => p.sector === selectedSector);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.project_name.toLowerCase().includes(q) ||
          p.project_id.toLowerCase().includes(q) ||
          (p.ministry && p.ministry.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [projects, query, activeChip, selectedSector]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, activeChip, selectedSector]);

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const startIndex = filtered.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div className="project-table-container">
      <div className="table-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search by project name, ID, or ministry..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="filter-dropdown-group">
          <label htmlFor="sector-filter">Sector:</label>
          <select
            id="sector-filter"
            className="filter-select"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
          >
            {sectorList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

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

      <div className="table-count-bar">
        <span>
          Showing <strong>{startIndex}</strong>–<strong>{endIndex}</strong> of <strong>{filtered.length.toLocaleString("en-IN")}</strong> matching projects
          {filtered.length < projects.length && ` (filtered from ${projects.length.toLocaleString("en-IN")} total)`}
        </span>
      </div>

      <div className="project-table-wrap">
        <table className="project-table">
          <thead>
            <tr>
              <th>Project Name & Ministry</th>
              <th>Sector</th>
              <th>Status</th>
              <th>Risk Level</th>
              <th>Original → Revised Cost</th>
              <th>Escalation</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">No projects match the selected search and filter criteria.</div>
                </td>
              </tr>
            )}
            {paginatedProjects.map((p) => {
              const overrun = p.cost_overrun_pct ?? 0;
              return (
                <tr key={p.project_id} onClick={() => onSelect(p.project_id)} style={{ cursor: "pointer" }}>
                  <td className="project-name-cell">
                    <div className="p-title">{p.project_name}</div>
                    <div className="p-sub">{p.ministry}</div>
                  </td>
                  <td className="project-sector-cell">{p.sector}</td>
                  <td>
                    <span className={`status-tag ${(p.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                      {p.status || "Ongoing"}
                    </span>
                  </td>
                  <td>
                    <span className={`risk-badge ${riskClass(p.risk_category)}`}>
                      {p.risk_category} ({p.risk_score || "N/A"})
                    </span>
                  </td>
                  <td className="cost-cell tabular">
                    {formatCr(p.original_cost_cr)}
                    <span className="cost-arrow">→</span>
                    {formatCr(p.revised_cost_cr)}
                  </td>
                  <td className="tabular font-bold">
                    <span className={overrun > 0 ? "text-danger" : "text-success"}>
                      {overrun > 0 ? `+${overrun.toFixed(1)}%` : `${overrun.toFixed(1)}%`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage(1)}
          >
            « First
          </button>
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            ‹ Prev
          </button>
          <span className="page-indicator">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            Next ›
          </button>
          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage(totalPages)}
          >
            Last »
          </button>
        </div>
      )}
    </div>
  );
}
