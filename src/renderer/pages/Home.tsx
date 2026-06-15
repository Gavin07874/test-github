interface HomeProps {
  onStart: () => void;
  onDashboard: () => void;
}

export function Home({ onStart, onDashboard }: HomeProps) {
  return (
    <main className="page page--home">
      <section className="home-panel">
        <span className="eyebrow">Scientific controller calibration</span>
        <h1>AimTune AI</h1>
        <p className="lede">Exact controller settings calculated from your gameplay.</p>
        <p>
          Measure controller input, run the Calibration Lab, record gameplay input,
          and add optional match stats to produce exact setting changes backed by
          real metrics.
        </p>
        <div className="action-row">
          <button className="button" onClick={onStart}>
            Start calibration setup
          </button>
          <button className="button button--secondary" onClick={onDashboard}>
            Dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
