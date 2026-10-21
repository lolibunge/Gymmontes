import TabBar from '@/components/TabBar';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="app">
      {children}
      <TabBar />
    </div>
  );
}
