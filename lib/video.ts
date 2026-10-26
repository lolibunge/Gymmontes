/** Cómo mostrar el video de una máquina según el link que cargó la entrenadora. */
export type VideoKind = { kind: 'youtube'; src: string } | { kind: 'file'; src: string } | { kind: 'link'; src: string; host: string };

export function videoFor(url: string | null): VideoKind | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const h = u.hostname.replace(/^www\.|^m\./, '');
  // YouTube: watch?v=, youtu.be/, shorts/
  let id: string | null = null;
  if (h === 'youtube.com') id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{6,})/)?.[1] ?? null;
  if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0] || null;
  if (id && /^[\w-]{6,}$/.test(id)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1` };
  if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: 'file', src: u.toString() };
  const host = h.includes('youtube') ? 'YouTube' : h.includes('instagram') ? 'Instagram' : h.includes('drive.google') ? 'Google Drive' : h.includes('tiktok') ? 'TikTok' : h;
  return { kind: 'link', src: u.toString(), host };
}
