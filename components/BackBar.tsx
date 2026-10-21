import Link from 'next/link';
import { Back } from './Icons';

export default function BackBar({ href, label = 'Volver', right }: { href: string; label?: string; right?: React.ReactNode }) {
  return (
    <header className="row" style={{ minHeight: 44 }}>
      <Link href={href} className="icon-btn" aria-label={label} style={{ marginLeft: -10 }}><Back /></Link>
      {right}
    </header>
  );
}
