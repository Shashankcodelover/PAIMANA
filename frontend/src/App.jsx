import { useEffect, useState } from "react";
import Hero from "./components/Hero.jsx";
import SectorBars from "./components/SectorBars.jsx";
import ProjectTable from "./components/ProjectTable.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import { getProjects, getOverview, getBySector } from "./api.js";

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
        <div>
          <h1>PAIMANA Risk Watch</h1>
          <div className="tagline">
            AI-powered early-warning system for Indian infrastructure projects
          </div>
        </div>
      </div>

      {error && (
        <div className="empty-state" style={{ marginBottom: 32 }}>
          Could not reach the API: {error}
        </div>
      )}

      <Hero overview={overview} />

      <section>
        <h2 className="section-heading">📊 Risk by Sector</h2>
        <SectorBars sectors={sectors} />
      </section>

      <section>
        <h2 className="section-heading">🏗️ Infrastructure Projects</h2>
        <ProjectTable projects={projects} onSelect={setSelectedId} />
      </section>

      {selectedProject && (
        <DetailPanel project={selectedProject} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
