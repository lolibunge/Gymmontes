'use client';
/**
 * "Ventanita" flotante con el cronómetro (Picture-in-Picture), para verlo encima de otras apps
 * (WhatsApp, Spotify…). Dibuja el tiempo en un canvas y lo muestra como un video en PiP.
 * Funciona en Chrome de Android y en Safari; donde no se puede, el botón no aparece.
 */
type Frame = { title: string; big: string; sub: string; red?: boolean };

const AUTO = 'gm-pip-auto';
/** Si la socia ya usó la ventanita, se abre sola en cada descanso (se puede apagar en la sesión). */
export function pipAuto() { try { return localStorage.getItem(AUTO) === '1'; } catch { return false; } }
export function setPipAuto(on: boolean) { try { localStorage.setItem(AUTO, on ? '1' : '0'); } catch {} }

let canvas: HTMLCanvasElement | null = null;
let video: HTMLVideoElement | null = null;
let getFrame: (() => Frame | null) | null = null;
let raf: ReturnType<typeof setInterval> | null = null;

export function pipSupported() {
  if (typeof document === 'undefined') return false;
  const v = document.createElement('video') as any;
  const canStream = typeof (HTMLCanvasElement.prototype as any).captureStream === 'function';
  return canStream && (!!(document as any).pictureInPictureEnabled || typeof v.webkitSetPresentationMode === 'function');
}

/** Escribe el texto achicando la letra (y si igual no entra, cortando con "…") para que nunca se salga del cuadro. */
function fit(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, weight: number, size: number, min: number) {
  let px = size;
  c.font = `${weight} ${px}px system-ui, sans-serif`;
  while (px > min && c.measureText(text).width > maxW) { px -= 2; c.font = `${weight} ${px}px system-ui, sans-serif`; }
  let t = text;
  while (t.length > 1 && c.measureText(t).width > maxW) t = t.slice(0, -2) + '…';
  c.fillText(t, x, y);
}

function draw() {
  if (!canvas || !getFrame) return;
  const f = getFrame();
  const c = canvas.getContext('2d')!;
  const W = canvas.width - 48;
  c.fillStyle = '#0e0e0e'; c.fillRect(0, 0, canvas.width, canvas.height);
  if (!f) { c.fillStyle = '#a3a3a3'; fit(c, 'GYM MONTES', 24, 100, W, 600, 28, 16); return; }
  c.fillStyle = '#d69ae8'; fit(c, f.title.toUpperCase(), 24, 44, W, 700, 26, 16);
  c.fillStyle = f.red ? '#ff453a' : '#f5f5f5'; fit(c, f.big, 24, 138, W, 900, 92, 40);
  c.fillStyle = '#a3a3a3'; fit(c, f.sub, 24, 172, W, 500, 24, 16);
}

export function pipOpen() {
  return !!video && (document as any).pictureInPictureElement === video;
}

export async function openPip(frame: () => Frame | null) {
  getFrame = frame;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = 360; canvas.height = 190;
  }
  draw();
  if (!video) {
    video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '');
    (video as any).autoPictureInPicture = true;
    video.srcObject = (canvas as any).captureStream(4);
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', right: '0', bottom: '0' });
    document.body.appendChild(video);
    video.addEventListener('leavepictureinpicture', () => { if (raf) { clearInterval(raf); raf = null; } });
  }
  if (!raf) raf = setInterval(draw, 250);
  await video.play().catch(() => {});
  try {
    if ((video as any).requestPictureInPicture) await (video as any).requestPictureInPicture();
    else (video as any).webkitSetPresentationMode?.('picture-in-picture');
  } catch {
    (video as any).webkitSetPresentationMode?.('picture-in-picture');
  }
}

export async function closePip() {
  try { if ((document as any).pictureInPictureElement) await (document as any).exitPictureInPicture(); } catch {}
  if (raf) { clearInterval(raf); raf = null; }
}
