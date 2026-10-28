/** Se muestra al instante al tocar un link, mientras llega la pantalla. */
export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-label="Cargando">
      <div className="skel" style={{ height: 22, width: '40%' }} />
      <div className="skel" style={{ height: 44, width: '75%' }} />
      <div className="skel" style={{ height: 140 }} />
      <div className="skel" style={{ height: 64 }} />
      <div className="skel" style={{ height: 64 }} />
    </main>
  );
}
