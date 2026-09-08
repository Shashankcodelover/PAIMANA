import { useEffect, useState, useMemo } from "react";
import Hero from "./components/Hero.jsx";
import SectorBars from "./components/SectorBars.jsx";
import ProjectTable from "./components/ProjectTable.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import EarlyWarningAlerts from "./components/EarlyWarningAlerts.jsx";
import DriverAnalysis from "./components/DriverAnalysis.jsx";
import BenchmarkingModal from "./components/BenchmarkingModal.jsx";
import IntelligenceAssistant from "./components/IntelligenceAssistant.jsx";
import { getProjects, getOverview, getBySector, BASE_URL } from "./api.js";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [overview, setOverview] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, overviewRes, sectorsRes] = await Promise.all([
          getProjects(),
          getOverview(),
          getBySector(),
        ]);
        setProjects(projectsRes);
        setOverview(overviewRes);
        setSectors(sectorsRes);
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, []);

  const selectedProject = projects.find((p) => p.project_id === selectedId) || null;

  const alertCount = useMemo(() => {
    return projects.filter(
      (p) => p.risk_category === "Critical" || p.risk_category === "High" || (p.cost_overrun_pct && p.cost_overrun_pct > 10)
    ).length;
  }, [projects]);

  return (
    <div className="app">
      {/* Top Masthead */}
      <header className="masthead">
        <div>
          <h1>PAIMANA Risk Watch</h1>
          <div className="tagline">
            MoSPI DIID • SIH 2026 Problem Statement 26103 • AI-Powered Early-Warning & Decision Support System
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "12px", color: "var(--mist-dim)" }}>
            Calibrated to Official MoSPI Aggregates
          </div>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#10B981" }}>
            ● 1,981 Projects • 17 Ministries • 22 Sectors
          </div>
        </div>
      </header>

      {error && (
        <div className="empty-state" style={{ marginBottom: 32 }}>
          <strong>Could not reach the backend API ({error}).</strong>
          <div style={{ marginTop: 8, fontSize: "0.9em", color: "var(--text-muted)" }}>
            Target: <code>{BASE_URL || "(relative origin)"}</code>. Running in offline client fallback mode with official MoSPI dataset.
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="nav-tabs" aria-label="Dashboard views">
        <button
          className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <span>📊</span> Executive Overview
        </button>
        <button
          className={`nav-tab ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          <span>🚨</span> Early Warning Alerts & Triage
          {alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
        </button>
        <button
          className={`nav-tab ${activeTab === "drivers" ? "active" : ""}`}
          onClick={() => setActiveTab("drivers")}
        >
          <span>🔍</span> Root Cause Drivers
        </button>
        <button
          className={`nav-tab ${activeTab === "benchmarks" ? "active" : ""}`}
          onClick={() => setActiveTab("benchmarks")}
        >
          <span>📈</span> ML Benchmarking & CUF
        </button>
      </nav>

      {/* Tab Views */}
      {activeTab === "overview" && (
        <main>
          <Hero overview={overview} />

          <section>
            <h2 className="section-heading">📊 Sector Overrun Risk & Trajectory</h2>
            <SectorBars sectors={sectors} />
          </section>

          <section>
            <h2 className="section-heading">🏗️ Central Infrastructure Projects (1,981 Ongoing)</h2>
            <ProjectTable projects={projects} onSelect={setSelectedId} />
          </section>
        </main>
      )}

      {activeTab === "alerts" && (
        <main>
          <EarlyWarningAlerts projects={projects} onSelect={setSelectedId} />
        </main>
      )}

      {activeTab === "drivers" && (
        <main>
          <DriverAnalysis />
        </main>
      )}

      {activeTab === "benchmarks" && (
        <main>
          <BenchmarkingModal />
        </main>
      )}

      {/* Detail Slideover Modal */}
      {selectedProject && (
        <DetailPanel project={selectedProject} onClose={() => setSelectedId(null)} />
      )}

      {/* Floating LLM Project Intelligence Assistant */}
      <IntelligenceAssistant projects={projects} />
    </div>
  );
}
