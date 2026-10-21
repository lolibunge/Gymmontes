type P = { size?: number; color?: string };
const s = (size = 24) => ({ width: size, height: size });

export const Back = ({ size = 24, color = 'currentColor' }: P) => (
  <svg {...s(size)} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke={color} strokeWidth="2" /></svg>
);
export const Chevron = ({ size = 18, color = 'var(--campana)' }: P) => (
  <svg {...s(size)} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke={color} strokeWidth="2" /></svg>
);
export const Arrow = ({ size = 20, color = 'currentColor' }: P) => (
  <svg {...s(size)} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" stroke={color} strokeWidth="2" /></svg>
);
export const Check = ({ size = 18, color = 'currentColor' }: P) => (
  <svg {...s(size)} viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" stroke={color} strokeWidth="2.2" /></svg>
);
export const Close = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...s(size)} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke={color} strokeWidth="2" /></svg>
);
export const Clock = ({ size = 18, color = 'currentColor' }: P) => (
  <svg {...s(size)} viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7.5" stroke={color} strokeWidth="1.8" /><path d="M9 4.5V9l3 2" stroke={color} strokeWidth="1.8" /></svg>
);
export const Music = ({ size = 18, color = 'currentColor' }: P) => (
  <svg {...s(size)} viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6.5 13.5V3.5l9-1.5v10" stroke={color} strokeWidth="1.8" /><circle cx="4.5" cy="13.5" r="2" stroke={color} strokeWidth="1.8" /><circle cx="13.5" cy="12" r="2" stroke={color} strokeWidth="1.8" /></svg>
);
export const QR = ({ size = 24 }: P) => (
  <svg {...s(size)} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5" stroke="var(--lona)" strokeWidth="2" /><rect x="8" y="8" width="8" height="8" fill="var(--violeta)" /></svg>
);
