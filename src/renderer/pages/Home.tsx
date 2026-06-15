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
          Confirm controller telemetry, mirror your game settings, run the
          Calibration Lab, and get exact setting changes backed by real metrics.
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
