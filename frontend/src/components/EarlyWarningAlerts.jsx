import { useMemo, useState } from "react";

function formatCr(value) {
  return `₹${Math.round(value).toLocaleString("en-IN")} cr`;
}

// Derive administrative action recommendation based on sector and risk factors
function getActionRecommendation(project) {
  const topFactor = (project.top_risk_factors && project.top_risk_factors[0]) || "";
  const sector = project.sector || "";
  
  if (topFactor.toLowerCase().includes("forest") || topFactor.toLowerCase().includes("clearance") || sector === "Coal" || sector === "Mines") {
    return "Fast-track Stage-II forest & wildlife clearance with MoEFCC PARIVESH portal";
  }
  if (topFactor.toLowerCase().includes("land") || sector === "Roads & Highways" || sector === "Railways") {
    return "Convene State Chief Secretary / District Collector task force for RoW and 3D land award";
  }
  if (topFactor.toLowerCase().includes("dispute") || topFactor.toLowerCase().includes("contract")) {
    return "Invoke Vivad se Vishwas-II institutional arbitration mechanism for contractor claim settlement";
  }
  if (project.expenditure_cr > project.original_cost_cr * 0.9 && project.physical_progress_pct < 60) {
    return "Deploy PM GatiShakti audit team to investigate capital burn rate divergence";
  }
  if (project.cost_overrun_pct > 20) {
    return "Mandate Revised Cost Committee (RCC) expenditure review prior to further fund tranches";
  }
  return "Schedule monthly OCAC review with administrative Ministry SPOC";
}

function getTriageTier(p) {
  if (p.risk_category === "Critical" || (p.cost_overrun_pct > 25 && p.status === "Critical")) {
    return { tier: "Immediate Intervention", priority: 1, class: "triage-immediate" };
  }
  if (p.risk_category === "High" || p.cost_overrun_pct > 15) {
    return { tier: "High Escalation Risk", priority: 2, class: "triage-high" };
  }
  return { tier: "Watchlist Alert", priority: 3, class: "triage-watch" };
}

export default function EarlyWarningAlerts({ projects = [], onSelect }) {
  const [activeTier, setActiveTier] = useState("All");
  const [selectedSector, setSelectedSector] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter only alert-worthy projects (Critical, High, or Cost Overrun > 10%)
  const alertProjects = useMemo(() => {
    return projects.filter(
      (p) => p.risk_category === "Critical" || p.risk_category === "High" || (p.cost_overrun_pct && p.cost_overrun_pct > 10)
    );
  }, [projects]);

  // Unique sectors among alert projects
  const sectors = useMemo(() => {
    const set = new Set(alertProjects.map((p) => p.sector));
    return ["All", ...Array.from(set).sort()];
  }, [alertProjects]);

  // Summary counts
  const summary = useMemo(() => {
    let immediate = 0;
    let high = 0;
    let watch = 0;
    let totalExposure = 0;

    alertProjects.forEach((p) => {
      const { tier } = getTriageTier(p);
      const exposure = p.revised_cost_cr || p.original_cost_cr || 0;
      totalExposure += exposure;
      if (tier === "Immediate Intervention") immediate++;
      else if (tier === "High Escalation Risk") high++;
      else watch++;
    });

    return { immediate, high, watch, totalExposure, count: alertProjects.length };
  }, [alertProjects]);

  // Filtered list
  const filteredAlerts = useMemo(() => {
    return alertProjects.filter((p) => {
      const { tier } = getTriageTier(p);
      if (activeTier !== "All" && tier !== activeTier) return false;
      if (selectedSector !== "All" && p.sector !== selectedSector) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.project_name.toLowerCase().includes(q) ||
          p.ministry.toLowerCase().includes(q) ||
          p.project_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alertProjects, activeTier, selectedSector, searchQuery]);

  return (
    <div className="alerts-container">
      {/* Metric Cards */}
      <div className="alerts-summary-grid">
        <div
          className={`alert-metric-card tier-immediate ${activeTier === "Immediate Intervention" ? "selected" : ""}`}
          onClick={() => setActiveTier(activeTier === "Immediate Intervention" ? "All" : "Immediate Intervention")}
        >
          <div className="metric-header">
            <span className="dot dot-red"></span>
            <span className="tier-name">Immediate Intervention</span>
          </div>
          <div className="metric-number">{summary.immediate}</div>
          <div className="metric-sub">Critical risk score or &gt;25% cost overrun</div>
        </div>

        <div
          className={`alert-metric-card tier-high ${activeTier === "High Escalation Risk" ? "selected" : ""}`}
          onClick={() => setActiveTier(activeTier === "High Escalation Risk" ? "All" : "High Escalation Risk")}
        >
          <div className="metric-header">
            <span className="dot dot-orange"></span>
            <span className="tier-name">High Escalation Risk</span>
          </div>
          <div className="metric-number">{summary.high}</div>
          <div className="metric-sub">High vulnerability / severe schedule slippage</div>
        </div>

        <div
          className={`alert-metric-card tier-watch ${activeTier === "Watchlist Alert" ? "selected" : ""}`}
          onClick={() => setActiveTier(activeTier === "Watchlist Alert" ? "All" : "Watchlist Alert")}
        >
          <div className="metric-header">
            <span className="dot dot-yellow"></span>
            <span className="tier-name">Watchlist Alert</span>
          </div>
          <div className="metric-number">{summary.watch}</div>
          <div className="metric-sub">Moderate risk with creeping expenditure</div>
        </div>

        <div className="alert-metric-card tier-exposure">
          <div className="metric-header">
            <span className="tier-name">Total Capital at Risk</span>
          </div>
          <div className="metric-number highlight-indigo">{formatCr(summary.totalExposure)}</div>
          <div className="metric-sub">Across {summary.count} flagged central projects</div>
        </div>
      </div>

      {/* Controls */}
      <div className="alerts-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Filter alerts by project name, ID, or ministry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="alerts-filter-group">
          <label htmlFor="sector-select">Sector:</label>
          <select
            id="sector-select"
            className="filter-select"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {activeTier !== "All" && (
            <button className="filter-chip clear-btn" onClick={() => setActiveTier("All")}>
              Reset Tier ({activeTier}) ✕
            </button>
          )}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state">No early warning alerts match the selected filters.</div>
        ) : (
          filteredAlerts.slice(0, 100).map((project) => {
            const triage = getTriageTier(project);
            const recommendation = getActionRecommendation(project);
            return (
              <div
                key={project.project_id}
                className={`alert-card ${triage.class}`}
                onClick={() => onSelect(project.project_id)}
              >
                <div className="alert-card-top">
                  <div className="alert-badge-group">
                    <span className={`triage-badge ${triage.class}`}>{triage.tier}</span>
                    <span className={`risk-badge ${(project.risk_category || "").toLowerCase()}`}>
                      Risk Score: {project.risk_score || "N/A"}/100
                    </span>
                    <span className="sector-pill">{project.sector}</span>
                  </div>
                  <div className="alert-cost-stat">
                    <span className="cost-label">Cost Escalation:</span>
                    <span className={`cost-val ${project.cost_overrun_pct > 0 ? "negative" : "positive"}`}>
                      {project.cost_overrun_pct > 0 ? `+${project.cost_overrun_pct.toFixed(1)}%` : `${project.cost_overrun_pct.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                <div className="alert-title-row">
                  <h4 className="alert-title">{project.project_name}</h4>
                  <span className="alert-ministry">{project.ministry}</span>
                </div>

                <div className="alert-body">
                  <div className="alert-stats-mini">
                    <div>
                      <span className="label">Original:</span>
                      <strong>{formatCr(project.original_cost_cr)}</strong>
                    </div>
                    <div>
                      <span className="label">Revised:</span>
                      <strong>{formatCr(project.revised_cost_cr)}</strong>
                    </div>
                    <div>
                      <span className="label">Expenditure:</span>
                      <strong>{formatCr(project.expenditure_cr)}</strong>
                    </div>
                    <div>
                      <span className="label">Progress:</span>
                      <strong>{project.physical_progress_pct}%</strong>
                    </div>
                  </div>

                  <div className="alert-recommendation-box">
                    <div className="rec-header">
                      <span className="rec-icon">⚡</span>
                      <strong>Recommended Administrative Action:</strong>
                    </div>
                    <p className="rec-text">{recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {filteredAlerts.length > 100 && (
          <div className="alerts-pagination-hint">
            Showing top 100 of {filteredAlerts.length} flagged alerts. Narrow search or filter by sector to inspect specific projects.
          </div>
        )}
      </div>
    </div>
  );
}
