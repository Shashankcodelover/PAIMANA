import benchmarkingData from "../data/benchmarking.json";

export default function BenchmarkingModal() {
  const { baseline, ml_ensemble, ablation_study } = benchmarkingData;

  return (
    <div className="analytics-container">
      <div className="section-header-box">
        <h2>📈 Model Benchmarking & CUF Field Analytics</h2>
        <p className="subtitle">
          Evaluation of Conventional Statistical Methods vs. AI/Machine Learning Models (SIH PS 26103 Dimensions B & C)
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="benchmarking-grid">
        <div className="benchmark-card baseline-card">
          <div className="card-badge">Conventional Baseline</div>
          <h3>OLS Linear Regression</h3>
          <p className="model-desc">
            Standard statistical ordinary least squares regression based on linear budget and sector intercepts.
          </p>
          <div className="metric-row">
            <div className="metric-box">
              <span className="metric-label">Test RMSE</span>
              <span className="metric-num">{baseline.rmse.toFixed(2)}%</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Test MAE</span>
              <span className="metric-num">{baseline.mae.toFixed(2)}%</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">R² Score</span>
              <span className="metric-num">0.48</span>
            </div>
          </div>
          <div className="benchmark-notes">
            <strong>Strengths:</strong> {baseline.advantages}<br />
            <strong>Limitations:</strong> {baseline.limitations}
          </div>
        </div>

        <div className="benchmark-card ml-card">
          <div className="card-badge highlight">AI / ML Tree Ensemble</div>
          <h3>XGBoost / Random Forest</h3>
          <p className="model-desc">
            Non-linear ensemble learning capturing ministry-sector interactions, scale thresholds, and risk tail distributions.
          </p>
          <div className="metric-row">
            <div className="metric-box">
              <span className="metric-label">Risk Accuracy</span>
              <span className="metric-num highlight">{(ml_ensemble.classifier_accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Weighted F1</span>
              <span className="metric-num highlight">{ml_ensemble.classifier_f1.toFixed(3)}</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Test MAE</span>
              <span className="metric-num">{ml_ensemble.mae.toFixed(2)}%</span>
            </div>
          </div>
          <div className="benchmark-notes">
            <strong>Key Benefit for MoSPI:</strong> {ml_ensemble.key_takeaway}
          </div>
        </div>
      </div>

      {/* CUF Ablation Study Section */}
      <div className="ablation-box">
        <div className="ablation-header">
          <h3>🔬 Common Upload Form (CUF) Feature Ablation Study</h3>
          <span className="ablation-badge">+{ablation_study.rmse_improvement_pct}% Predictive Accuracy Gain</span>
        </div>
        <p className="ablation-summary">
          Addressing <strong>Dimension (c)</strong> of PS 26103: Assessing how much predictive power is attributable
          strictly to existing CUF static fields versus newly engineered dynamic features.
        </p>

        <div className="ablation-comparison">
          <div className="ablation-col">
            <h4>Model A: CUF-Only Static Fields</h4>
            <div className="cuf-pill-list">
              {ablation_study.model_a_cuf_only.features.map((f) => (
                <span key={f} className="cuf-pill">{f}</span>
              ))}
            </div>
            <div className="ablation-stats">
              <span>RMSE: <strong>{ablation_study.model_a_cuf_only.rmse}</strong></span>
              <span>MAE: <strong>{ablation_study.model_a_cuf_only.mae}</strong></span>
            </div>
            <p className="text-muted">{ablation_study.model_a_cuf_only.description}</p>
          </div>

          <div className="ablation-arrow">➡️</div>

          <div className="ablation-col highlight">
            <h4>Model B: CUF + Engineered Dynamic Variables</h4>
            <div className="cuf-pill-list">
              {ablation_study.model_b_cuf_plus_engineered.features.map((f) => (
                <span key={f} className="cuf-pill active">{f}</span>
              ))}
            </div>
            <div className="ablation-stats">
              <span>RMSE: <strong className="green">{ablation_study.model_b_cuf_plus_engineered.rmse}</strong></span>
              <span>MAE: <strong className="green">{ablation_study.model_b_cuf_plus_engineered.mae}</strong></span>
            </div>
            <p className="text-muted">{ablation_study.model_b_cuf_plus_engineered.description}</p>
          </div>
        </div>

        <div className="policy-recommendation">
          <strong>🏛️ MoSPI Policy Takeaway:</strong> {ablation_study.policy_recommendation}.
        </div>
      </div>
    </div>
  );
}