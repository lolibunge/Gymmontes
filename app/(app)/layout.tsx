import TabBar from '@/components/TabBar';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { phrases } from '@/lib/data';
import PhraseTicker from '@/components/PhraseTicker';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  if (u.role === 'duena') redirect('/admin');
  return (
    <div className="app noselect">
      <PhraseTicker items={await phrases()} />
      {children}
      <TabBar />
    </div>
  );
}
