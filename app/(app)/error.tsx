'use client';
import Link from 'next/link';
import { useEffect } from 'react';

/** Si algo falla en una pantalla, en vez de quedar trancada mostramos cómo seguir. Las series quedan guardadas en el teléfono. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="page" style={{ justifyContent: 'center' }}>
      <h1 className="title">Algo falló</h1>
      <p className="muted">Puede ser la conexión del gym. Lo que cargaste en la sesión quedó guardado en el teléfono y se sube solo cuando vuelva la señal.</p>
      <button type="button" className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => reset()}>Reintentar</button>
      <Link href="/" className="btn btn-outline">Ir al inicio</Link>
    </main>
  );
}
