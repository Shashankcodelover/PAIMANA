import { useEffect, useRef, useState } from "react";
import ProjectAnimation from "./ProjectAnimation.jsx";
import { predict } from "../api.js";

function riskClass(category) {
  return (category || "").toLowerCase();
}

function formatCr(value) {
  return `₹${Math.round(value).toLocaleString("en-IN")} cr`;
}

export default function DetailPanel({ project, onClose }) {
  const [delayMonths, setDelayMonths] = useState(0);
  const [liveResult, setLiveResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    setDelayMonths(0);
    setLiveResult(null);
  }, [project?.project_id]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!project) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await predict({
          original_cost_cr: project.original_cost_cr,
          sector: project.sector,
          ministry: project.ministry,
          physical_progress_pct: project.physical_progress_pct,
          additional_delay_months: delayMonths,
        });
        setLiveResult(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [delayMonths, project]);

  if (!project) return null;

  const activeScore = liveResult ? liveResult.risk_score : project.risk_score;
  const activeCategory = liveResult ? liveResult.risk_category : project.risk_category;
  const activeDays = liveResult ? liveResult.predicted_time_overrun_days : project.predicted_time_overrun_days;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="detail-panel" ref={panelRef}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '200px', opacity: 0.15, zIndex: 0, overflow: 'hidden' }}>
          <ProjectAnimation sector={project.sector} />
        </div>
        
        <button className="detail-panel-close" onClick={onClose}>
          ✕ Close
        </button>
        
        <h2 className="detail-title" style={{ position: 'relative', zIndex: 1 }}>{project.project_name}</h2>
        <div className="detail-meta">
          {project.sector} · {project.ministry}
        </div>

        <div className="detail-stat-grid">
          <div>
            <div className="detail-stat-label">Original cost</div>
            <div className="detail-stat-value tabular">{formatCr(project.original_cost_cr)}</div>
          </div>
          <div>
            <div className="detail-stat-label">Revised cost</div>
            <div className="detail-stat-value tabular">
              {project.revised_cost_missing ? "Not reported" : formatCr(project.revised_cost_cr)}
            </div>
          </div>
          <div>
            <div className="detail-stat-label">Physical progress</div>
            <div className="detail-stat-value tabular">{project.physical_progress_pct}%</div>
          </div>
          <div>
            <div className="detail-stat-label">Status</div>
            <div className="detail-stat-value">{project.status}</div>
          </div>
        </div>

        <h3 className="detail-section-title">⚠️ Risk Factors</h3>
        <ul className="risk-factor-list">
          {(project.top_risk_factors || []).map((factor, i) => (
            <li key={i}>{factor}</li>
          ))}
        </ul>

        <div className="whatif-block">
          <h3 className="detail-section-title">🔮 What-If Simulator</h3>
          <div className="whatif-slider-row">
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={delayMonths}
              onChange={(e) => setDelayMonths(Number(e.target.value))}
            />
            <div className="whatif-slider-value tabular">
              {delayMonths} {delayMonths === 1 ? "month" : "months"}
            </div>
          </div>

          <div className="whatif-result">
            <div>
              <div className="detail-stat-label">Risk score</div>
              <div
                className="whatif-result-score tabular"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {activeScore != null ? Number(activeScore).toFixed(1) : "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--mist-dim)", marginTop: 4 }}>
                {Math.round(activeDays || 0)} days overrun
              </div>
            </div>
            <span className={`whatif-result-category risk-badge ${riskClass(activeCategory)}`}>
              {activeCategory}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
