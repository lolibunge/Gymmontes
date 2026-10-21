'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Chevron } from '@/components/Icons';

export default function Scanner({ machines }: { machines: { code: string; name: string }[] }) {
  const video = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'on' | 'unsupported' | 'denied'>('idle');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    const BD = (window as any).BarcodeDetector;
    if (!BD || !navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return; }
    const detector = new BD({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => {
      stream = s;
      if (video.current) { video.current.srcObject = s; video.current.play(); }
      setStatus('on');
      const tick = async () => {
        try {
          const codes = video.current ? await detector.detect(video.current) : [];
          const raw: string | undefined = codes[0]?.rawValue;
          const m = raw?.match(/\/m\/([A-Za-z0-9]+)/);
          if (m) { router.push(`/m/${m[1]}`); return; }
        } catch {}
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }).catch(() => setStatus('denied'));
    return () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [router]);

  return (
    <>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 4, overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'on' ? 'block' : 'none' }} />
        {status !== 'on' && (
          <p style={{ color: '#bdbdbd', textAlign: 'center', padding: 24, fontSize: 14 }}>
            {status === 'idle' && 'Abriendo la cámara…'}
            {status === 'denied' && 'Necesitamos permiso para usar la cámara.'}
            {status === 'unsupported' && 'En este teléfono escaneá el QR con la cámara del celular: abre la ficha directamente. También podés elegir la máquina de la lista.'}
          </p>
        )}
        {status === 'on' && <span aria-hidden="true" style={{ position: 'absolute', inset: '18%', boxShadow: 'inset 0 0 0 3px #c26bd8', borderRadius: 4 }} />}
      </div>
      <section>
        <h2 className="label" style={{ paddingBottom: 8 }}>O elegí la máquina</h2>
        {machines.map((m) => (
          <Link key={m.code} href={`/m/${m.code}`} className="list-row">
            <span><span className="muted" style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, marginRight: 10 }}>{m.code}</span>{m.name}</span>
            <Chevron />
          </Link>
        ))}
      </section>
    </>
  );
}
