import { useState, useMemo } from "react";
import benchmarkingData from "../data/benchmarking.json";

const DRIVER_DETAILS = {
  "Land acquisition delays": {
    pct: 31.4,
    sectors: "Roads & Highways, Railways, Urban Development, Water Resources",
    impact: "Severe (+18% to +45% average cost surge)",
    cause: "Delayed 3D/3G notifications under RFCTLARR Act 2013, disputed compensation awards, litigations in high courts.",
    mitigation: "State-level PM GatiShakti land portals, direct purchase via consent agreements, automated Bhoomi Rashi integration."
  },
  "Forest / environment clearance delays": {
    pct: 18.6,
    sectors: "Coal, Mines, Power (Hydro & Thermal), Atomic Energy",
    impact: "High (+12% to +28% schedule delay)",
    cause: "Complex Stage-I and Stage-II approvals, compensatory afforestation land identification, Gram Sabha consent under FRA 2006.",
    mitigation: "PARIVESH 2.0 single-window clearance, pre-approved land banks for afforestation, inter-ministerial FAC fast-tracking."
  },
  "Financing tie-up & fund flow delays": {
    pct: 12.2,
    sectors: "Urban Development, Shipping & Ports, Telecommunications",
    impact: "Moderate (+8% to +16% carrying cost escalation)",
    cause: "Delayed state equity shares, multi-lateral development bank (ADB/World Bank) loan covenants, counterpart funding lags.",
    mitigation: "SNA-SPARSH central treasury integration, escrow milestone disbursement, Sovereign Infrastructure Fund guarantees."
  },
  "Contractual disputes and arbitration": {
    pct: 11.1,
    sectors: "Railways, Roads & Highways, Civil Aviation",
    impact: "High (Arbitration liabilities, idle contractor machinery claims)",
    cause: "FIDIC / EPC contract ambiguities, delayed dispute board formation, appeals in commercial courts.",
    mitigation: "Vivad se Vishwas-II settlement framework, statutory Dispute Avoidance & Resolution Boards (DARB) mandatory clauses."
  },
  "Delays in detailed engineering": {
    pct: 8.2,
    sectors: "Petroleum & Natural Gas, Power, Steel",
    impact: "Moderate (Front-end loading delays, rework)",
    cause: "Incomplete DPR (Detailed Project Report), geotechnical site re-surveys, late changes in FEED specifications.",
    mitigation: "Standardized EPC tender templates, digital twin modeling before sanction, strict penalty clauses for consultant DPR errors."
  },
  "Scope changes & design revisions": {
    pct: 7.1,
    sectors: "Urban Development, Health, Railways",
    impact: "Variable (+10% to +35% cost addition)",
    cause: "Expansion of terminal capacities, addition of new flyovers / stations during execution without formal RCC approval.",
    mitigation: "Mandatory Public Investment Board (PIB) approval freeze, change-order ceiling caps of 10% on original contract value."
  },
  "Tendering & vendor ordering delays": {
    pct: 5.2,
    sectors: "Telecommunications, Petroleum, Heavy Industries",
    impact: "Moderate (Initial 6-12 months launch lag)",
    cause: "Single-bid re-tendering cycles, qualification challenges, geopolitical equipment import restrictions.",
    mitigation: "GeM (Government e-Marketplace) procurement mandate, vendor pre-qualification frameworks, two-stage bidding automation."
  },
  "Geological surprises (subsurface / tunneling)": {
    pct: 3.8,
    sectors: "Power (Hydro), Railways (Hill terrains), Water Resources",
    impact: "Severe localized (up to +150% cost in tunnel segments)",
    cause: "Himalayan thrust zones, water ingress, cave-ins, fragile seismic topography not detected in preliminary borehole testing.",
    mitigation: "Advanced LiDAR, 3D seismic tomography, Swiss-method geotechnical risk-sharing contracts."
  },
  "Law & order and right-of-way issues": {
    pct: 2.4,
    sectors: "Coal, Railways, Petroleum Pipelines",
    impact: "Localized schedule stoppages",
    cause: "Local agitation, illegal encroachments along rail/pipeline tracks, bandhs.",
    mitigation: "State Home Ministry liaison, RPF pipeline security squads, community benefit-sharing packages."
  }
};

const SECTOR_PROFILES = [
  {
    sector: "Water Resources & Irrigation",
    overrunPct: 154.2,
    leadDriver: "Land acquisition delays (42%)",
    secondaryDriver: "Inter-state water tribunals & clearance (28%)",
    riskProfile: "Critical"
  },
  {
    sector: "Railways",
    overrunPct: 48.6,
    leadDriver: "Land acquisition & RoW (44%)",
    secondaryDriver: "Contractor disputes & utility shifting (22%)",
    riskProfile: "High"
  },
  {
    sector: "Roads & Highways",
    overrunPct: 22.4,
    leadDriver: "Land acquisition compensation (39%)",
    secondaryDriver: "Utility relocation & forest permits (21%)",
    riskProfile: "Medium"
  },
  {
    sector: "Coal & Mines",
    overrunPct: 34.1,
    leadDriver: "Forest / environment clearances (51%)",
    secondaryDriver: "Land possession & R&R compensation (27%)",
    riskProfile: "High"
  },
  {
    sector: "Power (Hydro & Thermal)",
    overrunPct: 62.8,
    leadDriver: "Geological surprises & tunneling (33%)",
    secondaryDriver: "Environmental clearances & local agitation (29%)",
    riskProfile: "Critical"
  },
  {
    sector: "Petroleum & Natural Gas",
    overrunPct: 14.5,
    leadDriver: "Global material / equipment inflation (32%)",
    secondaryDriver: "Right-of-Use pipeline acquisitions (26%)",
    riskProfile: "Low"
  }
];

export default function DriverAnalysis() {
  const [selectedDriver, setSelectedDriver] = useState("Land acquisition delays");
  const driverData = DRIVER_DETAILS[selectedDriver];

  return (
    <div className="driver-analysis-container">
      <div className="section-header-box">
        <h2>🔍 Cost & Time Escalation Driver Analysis</h2>
        <p className="subtitle">
          Decomposition of the 9 systemic root causes driving budget and timeline variance across 1,981 central infrastructure projects (SIH PS 26103 Outcome f)
        </p>
      </div>

      {/* Driver Distribution Bar Chart */}
      <div className="driver-overview-card">
        <h3>Systemic Contribution of Delay & Cost Drivers</h3>
        <p className="text-muted">
          Click any driver bar below to drill down into root causes, affected sectors, and MoSPI mitigation protocols:
        </p>

        <div className="driver-bars-list">
          {Object.entries(DRIVER_DETAILS).map(([name, data]) => {
            const isSelected = selectedDriver === name;
            return (
              <div
                key={name}
                className={`driver-bar-item ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedDriver(name)}
              >
                <div className="driver-bar-meta">
                  <span className="driver-name">{name}</span>
                  <span className="driver-pct">{data.pct}%</span>
                </div>
                <div className="driver-progress-bg">
                  <div
                    className="driver-progress-fill"
                    style={{
                      width: `${data.pct * 2.8}%`,
                      background: isSelected
                        ? "linear-gradient(90deg, #667eea 0%, #764ba2 100%)"
                        : "#A0AEC0"
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Driver Drill-Down Panel */}
      {driverData && (
        <div className="driver-drilldown-card">
          <div className="drilldown-header">
            <div className="drilldown-title">
              <span className="badge-tag">Selected Root Cause</span>
              <h3>{selectedDriver}</h3>
            </div>
            <div className="drilldown-stat">
              <span className="stat-label">National Contribution</span>
              <span className="stat-num">{driverData.pct}%</span>
            </div>
          </div>

          <div className="drilldown-grid">
            <div className="drilldown-box">
              <span className="box-label">Primary Sectors Impacted</span>
              <p className="box-val highlight">{driverData.sectors}</p>
            </div>
            <div className="drilldown-box">
              <span className="box-label">Escalation Severity</span>
              <p className="box-val">{driverData.impact}</p>
            </div>
            <div className="drilldown-box full-width">
              <span className="box-label">Mechanisms of Escalation</span>
              <p className="box-val">{driverData.cause}</p>
            </div>
            <div className="drilldown-box full-width policy-box">
              <span className="box-label">⚡ MoSPI / PM GatiShakti Mitigation Strategy</span>
              <p className="box-val policy-text">{driverData.mitigation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Sector Driver Profile Table */}
      <div className="sector-profiles-card">
        <h3>Cross-Sector Bottleneck Profiling</h3>
        <p className="text-muted">
          Sector-level divergence in primary and secondary escalation drivers:
        </p>

        <div className="table-responsive">
          <table className="sector-profile-table">
            <thead>
              <tr>
                <th>Sector</th>
                <th>Historical Cost Overrun</th>
                <th>Dominant Cost Driver (Rank 1)</th>
                <th>Secondary Cost Driver (Rank 2)</th>
                <th>Vulnerability Profile</th>
              </tr>
            </thead>
            <tbody>
              {SECTOR_PROFILES.map((sp) => (
                <tr key={sp.sector}>
                  <td className="sector-name-cell">{sp.sector}</td>
                  <td className="tabular font-bold">+{sp.overrunPct}%</td>
                  <td>{sp.leadDriver}</td>
                  <td>{sp.secondaryDriver}</td>
                  <td>
                    <span className={`risk-badge ${sp.riskProfile.toLowerCase()}`}>
                      {sp.riskProfile}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
