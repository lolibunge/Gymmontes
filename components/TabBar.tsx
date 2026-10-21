'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QR } from './Icons';

const TABS = [
  { href: '/', label: 'Inicio', match: (p: string) => p === '/' || p.startsWith('/comunidad'), d1: 'M3 10l8-6 8 6v9H3z', d2: 'M9 19v-5h4v5' },
  { href: '/rutina', label: 'Rutinas', match: (p: string) => p.startsWith('/rutina') || p.startsWith('/sesion') || p.startsWith('/timer'), d1: 'M5 7h3v8H5zM14 7h3v8h-3z', d2: 'M1.5 11h3.5M17 11h3.5M8 11h6' },
  { href: '/pedir', label: 'Pedir', match: (p: string) => p.startsWith('/pedir'), d1: 'M4 3h14v17H4z', d2: 'M8 8h6M8 12h6M8 16h3' },
  { href: '/perfil', label: 'Perfil', match: (p: string) => p.startsWith('/perfil'), d1: 'M11 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM3 20c1-4 4.5-6 8-6s7 2 8 6z', d2: '' },
];

function Tab({ t, on }: { t: (typeof TABS)[number]; on: boolean }) {
  const ink = on ? 'var(--violeta-texto)' : 'var(--campana)';
  return (
    <Link href={t.href} className="tab" aria-current={on ? 'page' : undefined}>
      <span className="pill">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d={t.d1} fill={on ? ink : 'none'} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          {t.d2 && <path d={t.d2} stroke={on ? 'var(--venda)' : ink} strokeWidth="2" />}
        </svg>
      </span>
      {t.label}
    </Link>
  );
}

export default function TabBar() {
  const p = usePathname() || '/';
  return (
    <nav className="tabbar" aria-label="Menú principal">
      <div className="tabbar-inner">
        <Tab t={TABS[0]} on={TABS[0].match(p)} />
        <Tab t={TABS[1]} on={TABS[1].match(p)} />
        <Link href="/escanear" className="scan" aria-label="Escanear el QR de una máquina"><QR /></Link>
        <Tab t={TABS[2]} on={TABS[2].match(p)} />
        <Tab t={TABS[3]} on={TABS[3].match(p)} />
      </div>
    </nav>
  );
}
