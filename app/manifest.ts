import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GYM MONTES',
    short_name: 'GYM MONTES',
    description: 'Tu rutina, tus pesos y tu progreso en GYM MONTES.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0e0e',
    theme_color: '#0e0e0e',
    lang: 'es',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
