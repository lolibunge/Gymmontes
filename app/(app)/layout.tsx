import TabBar from '@/components/TabBar';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  if (u.role === 'duena') redirect('/admin');
  return (
    <div className="app">
      {children}
      <TabBar />
    </div>
  );
}
