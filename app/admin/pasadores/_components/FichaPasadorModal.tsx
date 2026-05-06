'use client';

import { useState } from 'react';

export type PostulacionPasador = {
  id: number;
  nombre_completo: string | null;
  dni: string | null;
  wa_user_id: string | null;
  estado: string | null;
  correcciones: any;
  imagen_frente_url: string | null;
  imagen_dorso_url: string | null;
  pdf_url: string | null;
  created_at: string | null;
};

const CAMPOS = [
  { key: 'nombre_completo', label: 'Nombre completo' },
  { key: 'dni', label: 'DNI' },
  { key: 'imagen_frente', label: 'Frente del DNI' },
  { key: 'imagen_dorso', label: 'Dorso del DNI' },
];

const PRINT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;background:#fff;padding:48px 56px;font-size:13px;line-height:1.6}
.header{border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end}
.title{font-size:20px;font-weight:300;letter-spacing:.08em;text-transform:uppercase}
.subtitle{font-size:10px;color:#aaa;margin-top:4px}
.meta{font-size:10px;color:#aaa;text-align:right}
.section{margin-bottom:24px}
.slabel{font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#aaa;border-bottom:1px solid #eee;padding-bottom:5px;margin-bottom:12px}
.field{display:flex;gap:8px;margin-bottom:6px}
.fl{font-size:11px;color:#888;min-width:175px;flex-shrink:0}
.fv{font-size:13px;font-weight:500}
.badge{display:inline-block;padding:1px 8px;border-radius:100px;font-size:10px;font-weight:600;border:1px solid currentColor}
.pendiente{color:#b45309}.lista_para_revision{color:#1d4ed8}.requiere_correccion{color:#7c3aed}.aceptada{color:#047857}.denegada{color:#b91c1c}
.imgs{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px}
.imgs img{max-height:240px;max-width:calc(50% - 8px);border:1px solid #e5e5e5;border-radius:6px;object-fit:cover}
.pdf-link{display:inline-block;margin-top:8px;font-size:12px;color:#2563eb;text-decoration:underline}
.footer{margin-top:48px;padding-top:12px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#ccc}
`;

function buildPrintHTML(p: PostulacionPasador) {
  const fecha = p.created_at
    ? new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  const correccionesText = p.correcciones
    ? typeof p.correcciones === 'string'
      ? p.correcciones
      : JSON.stringify(p.correcciones)
    : null;

  const imgs = [p.imagen_frente_url, p.imagen_dorso_url].filter(Boolean);

  return `
    <div class="header">
      <div>
        <div class="title">Postulación de Pasador</div>
        <div class="subtitle">ID: ${p.id}</div>
      </div>
      <div class="meta">Presentada: ${fecha}<br/>Impreso: ${hoy}</div>
    </div>

    <div class="section">
      <div class="slabel">Solicitante</div>
      <div class="field"><span class="fl">Nombre completo</span><span class="fv">${p.nombre_completo || '—'}</span></div>
      <div class="field"><span class="fl">DNI</span><span class="fv">${p.dni || '—'}</span></div>
      <div class="field"><span class="fl">WhatsApp</span><span class="fv">${p.wa_user_id || '—'}</span></div>
      <div class="field"><span class="fl">Estado</span><span class="fv"><span class="badge ${p.estado || ''}">${p.estado || '—'}</span></span></div>
      ${correccionesText ? `<div class="field"><span class="fl">Correcciones</span><span class="fv">${correccionesText}</span></div>` : ''}
    </div>

    ${imgs.length > 0 ? `
    <div class="section">
      <div class="slabel">Documentación — DNI</div>
      <div class="imgs">
        ${imgs.map((url, i) => `<img src="${url}" alt="${i === 0 ? 'Frente' : 'Dorso'} DNI" />`).join('')}
      </div>
    </div>
    ` : ''}

    ${p.pdf_url ? `
    <div class="section">
      <div class="slabel">Documento PDF</div>
      <a class="pdf-link" href="${p.pdf_url}">${p.pdf_url}</a>
    </div>
    ` : ''}

    <div class="footer">
      <span>Mi Pasador — Gestión de Pasadores</span>
      <span>${hoy}</span>
    </div>
  `;
}

function handlePrint(p: PostulacionPasador) {
  const win = window.open('', '_blank', 'width=860,height=1080');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Ficha — ${p.nombre_completo || p.id}</title><style>${PRINT_CSS}</style></head><body>${buildPrintHTML(p)}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

const estadoBadge: Record<string, string> = {
  pendiente: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  lista_para_revision: 'bg-blue-50 text-blue-800 border border-blue-200',
  requiere_correccion: 'bg-purple-50 text-purple-800 border border-purple-200',
  aceptada: 'bg-green-50 text-green-800 border border-green-200',
  denegada: 'bg-red-50 text-red-800 border border-red-200',
};

interface Props {
  postulacion: PostulacionPasador;
  onClose: () => void;
  onAccept: () => Promise<void>;
  onDeny: () => Promise<void>;
  onRequestMod: (campos: string[], observacion: string) => Promise<void>;
}

export function FichaPasadorModal({ postulacion: p, onClose, onAccept, onDeny, onRequestMod }: Props) {
  const [view, setView] = useState<'main' | 'mod'>('main');
  const [campos, setCampos] = useState<string[]>([]);
  const [observacion, setObservacion] = useState('');
  const [processing, setProcessing] = useState(false);

  const isActionable = p.estado === 'pendiente' || p.estado === 'lista_para_revision';

  const toggleCampo = (key: string) =>
    setCampos(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  async function run(fn: () => Promise<void>) {
    setProcessing(true);
    try { await fn(); onClose(); }
    catch { alert('Error al procesar la acción'); }
    finally { setProcessing(false); }
  }

  const correccionesText = p.correcciones
    ? typeof p.correcciones === 'string'
      ? p.correcciones
      : JSON.stringify(p.correcciones, null, 2)
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400">
            Ficha de Postulación · Pasador
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handlePrint(p)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              PDF
            </button>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-2xl leading-none transition-colors">×</button>
          </div>
        </div>

        {/* Document */}
        <div className="overflow-y-auto flex-1 px-8 py-6">
          <div className="flex justify-between items-end border-b-2 border-gray-900 pb-4 mb-7">
            <div>
              <h1 className="text-xl font-light tracking-[0.06em] uppercase text-gray-900">
                Postulación de Pasador
              </h1>
              <p className="text-[10px] text-gray-400 mt-1">ID: {p.id}</p>
            </div>
            <div className="text-right text-[10px] text-gray-400">
              {p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            </div>
          </div>

          <div className="space-y-6">
            {/* Solicitante */}
            <section>
              <h2 className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 border-b border-gray-100 pb-1.5 mb-3">
                Solicitante
              </h2>
              <dl className="space-y-2.5">
                {[
                  ['Nombre completo', p.nombre_completo],
                  ['DNI', p.dni],
                  ['WhatsApp', p.wa_user_id],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="text-[11px] text-gray-400 w-40 shrink-0">{label}</dt>
                    <dd className="text-[13px] font-medium text-gray-900">{value || '—'}</dd>
                  </div>
                ))}
                <div className="flex gap-3 items-center">
                  <dt className="text-[11px] text-gray-400 w-40 shrink-0">Estado</dt>
                  <dd>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${estadoBadge[p.estado || ''] || 'bg-gray-100 text-gray-600'}`}>
                      {p.estado || '—'}
                    </span>
                  </dd>
                </div>
                {correccionesText && (
                  <div className="flex gap-3">
                    <dt className="text-[11px] text-gray-400 w-40 shrink-0">Correcciones</dt>
                    <dd className="text-[12px] text-purple-700 whitespace-pre-line">{correccionesText}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Documentación */}
            {(p.imagen_frente_url || p.imagen_dorso_url) && (
              <section>
                <h2 className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 border-b border-gray-100 pb-1.5 mb-3">
                  Documentación — DNI
                </h2>
                <div className="flex gap-4 flex-wrap">
                  {p.imagen_frente_url && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400">Frente</span>
                      <img src={p.imagen_frente_url} alt="Frente DNI" className="max-h-48 rounded-lg border border-gray-100 object-cover" />
                    </div>
                  )}
                  {p.imagen_dorso_url && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400">Dorso</span>
                      <img src={p.imagen_dorso_url} alt="Dorso DNI" className="max-h-48 rounded-lg border border-gray-100 object-cover" />
                    </div>
                  )}
                </div>
              </section>
            )}

            {p.pdf_url && (
              <section>
                <h2 className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 border-b border-gray-100 pb-1.5 mb-3">
                  Documento PDF
                </h2>
                <a
                  href={p.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Abrir PDF
                </a>
              </section>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/70 rounded-b-2xl">
          {view === 'main' ? (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                {!isActionable ? `Esta postulación ya fue ${p.estado}` : 'Revisá la ficha antes de actuar'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('mod')}
                  disabled={!isActionable || processing}
                  className="px-3.5 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Pedir modificación
                </button>
                <button
                  onClick={() => run(onDeny)}
                  disabled={!isActionable || processing}
                  className="px-3.5 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Denegar
                </button>
                <button
                  onClick={() => run(onAccept)}
                  disabled={!isActionable || processing}
                  className="px-3.5 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Aceptar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">
                Campos a corregir
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {CAMPOS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={campos.includes(c.key)}
                      onChange={() => toggleCampo(c.key)}
                      className="rounded border-gray-300"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder="Observaciones (se enviarán por WhatsApp al solicitante)"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setView('main'); setCampos([]); setObservacion(''); }}
                  className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => run(() => onRequestMod(campos, observacion))}
                  disabled={campos.length === 0 || processing}
                  className="px-3.5 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Enviar solicitud
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
