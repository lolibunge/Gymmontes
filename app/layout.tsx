import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/archivo';
import '@fontsource-variable/inter';
import { currentUser } from '@/lib/auth';
import SWRegister from '@/components/SWRegister';
import './globals.css';


export const metadata: Metadata = {
  title: 'GYM MONTES',
  description: 'Tu rutina, tus pesos y tu progreso en GYM MONTES.',
  applicationName: 'GYM MONTES',
  appleWebApp: { capable: true, title: 'GYM MONTES', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-180.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e0e' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let theme = 'auto';
  try {
    const u = await currentUser();
    if (u) theme = u.theme;
  } catch {
    // sin base todavía: tema automático
  }
  const cls = theme === 'oscuro' ? 't-oscuro' : theme === 'claro' ? 't-claro' : 't-auto';
  return (
    <html lang="es" className={cls}>
      <body>
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
