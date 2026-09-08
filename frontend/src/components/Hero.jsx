import { useEffect, useRef, useState } from "react";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function formatCrore(value) {
  // Indian numbering: crore figures read better with lakh-crore grouping above 1,00,000 cr.
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} lakh cr`;
  }
  return `₹${Math.round(value).toLocaleString("en-IN")} cr`;
}

export default function Hero({ overview }) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  const atRisk = overview ? Math.max(0, overview.total_at_risk_cr) : 0;

  useEffect(() => {
    if (!overview || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      setDisplayValue(atRisk * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);

  return (
    <div className="hero">
      <div className="hero-number tabular">
        {overview ? formatCrore(displayValue) : "—"}
      </div>
      <div className="hero-label">
        Estimated cost exposure above what was originally sanctioned, across every ongoing
        project this system is tracking.
      </div>
      {overview && (
        <div className="hero-secondary">
          <span>
            <strong className="tabular">{overview.total_projects}</strong> projects
          </span>
          <span>
            across <strong className="tabular">{overview.total_sectors}</strong> sectors
          </span>
        </div>
      )}
    </div>
  );
}
