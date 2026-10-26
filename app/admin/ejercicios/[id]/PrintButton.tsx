'use client';
export default function PrintButton() {
  return <button type="button" className="btn btn-outline" onClick={() => window.print()} style={{ justifyContent: 'center', minHeight: 44, fontSize: 14 }}>Imprimir sticker</button>;
}
