export default function Loading() {
  return (
    <main className="content-shell">
      <div className="loading-stack">
        <div className="loading-bar loading-bar--wide" />
        <div className="loading-bar loading-bar--medium" />
        <div className="loading-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="loading-card" />
          ))}
        </div>
      </div>
    </main>
  );
}