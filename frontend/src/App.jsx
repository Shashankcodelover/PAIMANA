import { useEffect, useState } from "react";
import Hero from "./components/Hero.jsx";
import SectorBars from "./components/SectorBars.jsx";
import ProjectTable from "./components/ProjectTable.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import { getProjects, getOverview, getBySector, BASE_URL } from "./api.js";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [overview, setOverview] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <div className="app">
      <div className="masthead">
        <h1>PAIMANA Risk Watch</h1>
        <div className="tagline">
          Early-warning cost and time overrun risk for central-government infrastructure projects,
          built on MoSPI PAIMANA project-monitoring data.
        </div>
      </div>

      {error && (
        <div className="empty-state" style={{ marginBottom: 32 }}>
          <strong>Could not reach the backend API ({error}).</strong>
          <div style={{ marginTop: 8, fontSize: "0.9em", color: "var(--text-muted)" }}>
            Target: <code>{BASE_URL || "(relative origin)"}</code>.
            If running locally, ensure the backend is running at port 8000.
            If deployed on Vercel, verify your backend service is running and set <code>VITE_API_URL</code> in Vercel environment settings.
          </div>
        </div>
      )}

      <Hero overview={overview} />

      <section>
        <h2 className="section-heading">Risk by sector</h2>
        <SectorBars sectors={sectors} />
      </section>

      <section>
        <h2 className="section-heading">Projects</h2>
        <ProjectTable projects={projects} onSelect={setSelectedId} />
      </section>

      {selectedProject && (
        <DetailPanel project={selectedProject} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
