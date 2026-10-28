export default function Loading() {
  return (
    <main className="page tight" aria-busy="true" aria-label="Abriendo la sesión">
      <div className="skel" style={{ height: 44 }} />
      <div className="skel" style={{ height: 4 }} />
      <div className="skel" style={{ height: 16, width: '30%' }} />
      <div className="skel" style={{ height: 40, width: '80%' }} />
      <div className="skel" style={{ height: 48 }} />
      <div className="skel" style={{ height: 48 }} />
      <div className="skel" style={{ height: 48 }} />
      <p className="caption muted" style={{ textAlign: 'center' }}>Abriendo la sesión…</p>
    </main>
  );
}
