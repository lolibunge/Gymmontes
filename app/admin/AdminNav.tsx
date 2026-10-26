'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav({ pending }: { pending: number }) {
  const p = usePathname() || '';
  const tab = (href: string, label: string, badge?: number) => {
    const on = p.startsWith(href);
    return (
      <Link href={href} aria-current={on ? 'page' : undefined}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 2px', fontWeight: on ? 700 : 500, fontSize: 15,
          color: on ? 'var(--guante)' : 'var(--campana)', boxShadow: on ? 'inset 0 -3px 0 var(--violeta)' : 'none' }}>
        {label}
        {!!badge && <span className="badge" style={{ background: 'var(--violeta)', color: 'var(--on-violeta)', borderRadius: 999, padding: '2px 8px' }}>{badge}</span>}
      </Link>
    );
  };
  return (
    <nav aria-label="Panel" style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--linea)' }}>
      {tab('/admin/pedidos', 'Pedidos', pending)}
      {tab('/admin/socios', 'Socios')}
    </nav>
  );
}
