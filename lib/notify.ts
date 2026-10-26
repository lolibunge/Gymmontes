// Avisos a la dueña. El email solo se manda si están RESEND_API_KEY y OWNER_EMAIL.
export async function emailOwner(subject: string, html: string) {
  const to = process.env.OWNER_EMAIL;
  if (!to) return false;
  return sendEmail(to.split(',').map((s) => s.trim()), subject, html);
}

export const emailEnabled = () => !!process.env.RESEND_API_KEY;

export async function sendEmail(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'GYM MONTES <onboarding@resend.dev>', to, subject, html }),
    });
    if (!r.ok) console.error('[email]', r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error('[email]', e);
    return false;
  }
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function whatsappLink(text: string): string | null {
  const n = (process.env.GYM_WHATSAPP || '').replace(/\D/g, '');
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
