interface HomeProps {
  onStart: () => void;
  onDashboard: () => void;
}

export function Home({ onStart, onDashboard }: HomeProps) {
  return (
    <main className="page page--home">
      <section className="hero-panel">
        <span className="eyebrow">Square-one rebuild</span>
        <h1>AimTune AI</h1>
        <p>
          Calibrate your controller, analyze selected-window gameplay locally,
          and get exact settings to apply yourself.
        </p>
        <div className="hero-actions">
          <button className="button" onClick={onStart}>
            Start setup
          </button>
          <button className="button button--secondary" onClick={onDashboard}>
            Dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
