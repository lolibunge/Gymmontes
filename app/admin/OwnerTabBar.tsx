'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Resumen', exact: true, d1: 'M3 3h7v7H3zM12 3h7v4h-7zM12 9h7v10h-7zM3 12h7v7H3z', d2: '' },
  { href: '/admin/pedidos', label: 'Pedidos', d1: 'M3 5h16v12H3z', d2: 'M3 6l8 6 8-6' },
  { href: '/admin/socios', label: 'Socios', d1: 'M8 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM2 19c.7-3.5 3.2-5 6-5s5.3 1.5 6 5z', d2: 'M14.5 4.5a3 3 0 0 1 0 6M17 14c1.8.6 2.8 2.2 3.2 5' },
  { href: '/admin/gym', label: 'Gym', d1: 'M4 8l7-4 7 4v11H4z', d2: 'M8 19v-6h6v6' },
];

export default function OwnerTabBar({ pending }: { pending: number }) {
  const p = usePathname() || '';
  return (
    <nav className="tabbar" aria-label="Menú de la dueña">
      <div className="tabbar-inner" style={{ justifyContent: 'space-around' }}>
        {TABS.map((t) => {
          const on = t.exact ? p === t.href : p.startsWith(t.href);
          const ink = on ? 'var(--violeta-texto)' : 'var(--campana)';
          const badge = t.label === 'Pedidos' ? pending : 0;
          return (
            <Link key={t.href} href={t.href} className="tab" aria-current={on ? 'page' : undefined} style={{ width: 76 }}>
              <span className="pill" style={{ position: 'relative' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d={t.d1} fill={on ? ink : 'none'} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
                  {t.d2 && <path d={t.d2} stroke={on ? 'var(--venda)' : ink} strokeWidth="2" />}
                </svg>
                {badge > 0 && (
                  <span aria-label={`${badge} nuevos`} style={{ position: 'absolute', top: -2, right: 6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--violeta)', color: 'var(--on-violeta)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
