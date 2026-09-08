const STOPS = [
  { at: 0, color: [63, 167, 150] },   // --risk-low
  { at: 25, color: [148, 165, 106] }, // --risk-medium
  { at: 50, color: [232, 163, 61] },  // --risk-high
  { at: 90, color: [214, 69, 80] },   // --risk-critical
];

function interpolateColor(value) {
  const v = Math.max(0, Math.min(90, value));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (v >= a.at && v <= b.at) {
      const t = (v - a.at) / (b.at - a.at);
      const rgb = a.color.map((c, idx) => Math.round(c + (b.color[idx] - c) * t));
      return `rgb(${rgb.join(",")})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1].color.join(",")})`;
}

export default function SectorBars({ sectors }) {
  if (!sectors || sectors.length === 0) {
    return <div className="empty-state">No sector data available.</div>;
  }

  const getOverrun = (s) => (s.avg_cost_overrun_pct ?? s.mean_cost_overrun_pct ?? 0);
  const maxAbs = Math.max(10, ...sectors.map((s) => Math.abs(getOverrun(s))));

  return (
    <div className="sector-bars">
      {sectors.map((s) => {
        const overrun = getOverrun(s);
        const widthPct = Math.min(100, (Math.max(0, overrun) / maxAbs) * 100);
        return (
          <div className="sector-bar-row" key={s.sector}>
            <div className="sector-bar-name" title={s.sector}>
              {s.sector}
            </div>
            <div className="sector-bar-track">
              <div
                className="sector-bar-fill"
                style={{
                  width: `${widthPct}%`,
                  background: interpolateColor(overrun),
                }}
              />
            </div>
            <div className="sector-bar-value tabular">
              {overrun > 0 ? "+" : ""}
              {overrun.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
