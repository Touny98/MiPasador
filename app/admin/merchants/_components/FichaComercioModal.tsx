'use client';

import { useState } from 'react';
import { acceptPostulacionComercio, denyPostulacionComercio, requestModificationComercio } from '../actions';

export type PostulacionComercio = {
  id: string;
  nombre_completo: string | null;
  nombre_negocio: string | null;
  dni: string | null;
  categoria_productos: string | null;
  direccion: string | null;
  foto_local_url: string | null;
  estado: string | null;
  correcciones: string | null;
  wa_user_id: string;
  created_at: string | null;
};

const CAMPOS = [
  { key: 'nombre_completo', label: 'Nombre completo' },
  { key: 'nombre_negocio', label: 'Nombre del negocio' },
  { key: 'dni', label: 'DNI' },
  { key: 'categoria_productos', label: 'Categoría de productos' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'foto_local', label: 'Foto del local' },
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
.pendiente{color:#b45309}.aceptada{color:#047857}.denegada{color:#b91c1c}.requiere_modificacion{color:#7c3aed}
img{max-height:280px;max-width:100%;border:1px solid #e5e5e5;border-radius:6px;object-fit:cover;margin-top:8px}
.footer{margin-top:48px;padding-top:12px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#ccc}
`;

function buildPrintHTML(p: PostulacionComercio) {
  const fecha = p.created_at
    ? new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `
    <div class="header">
      <div>
        <div class="title">Postulación de Comercio</div>
        <div class="subtitle">ID: ${p.id}</div>
      </div>
      <div class="meta">Presentada: ${fecha}<br/>Impreso: ${hoy}</div>
    </div>

    <div class="section">
      <div class="slabel">Solicitante</div>
      <div class="field"><span class="fl">Nombre completo</span><span class="fv">${p.nombre_completo || '—'}</span></div>
      <div class="field"><span class="fl">DNI</span><span class="fv">${p.dni || '—'}</span></div>
      <div class="field"><span class="fl">WhatsApp</span><span class="fv">${p.wa_user_id}</span></div>
      <div class="field"><span class="fl">Estado</span><span class="fv"><span class="badge ${p.estado || ''}">${p.estado || '—'}</span></span></div>
      ${p.correcciones ? `<div class="field"><span class="fl">Correcciones</span><span class="fv">${p.correcciones}</span></div>` : ''}
    </div>

    <div class="section">
      <div class="slabel">Negocio</div>
      <div class="field"><span class="fl">Nombre del negocio</span><span class="fv">${p.nombre_negocio || '—'}</span></div>
      <div class="field"><span class="fl">Categoría</span><span class="fv">${p.categoria_productos || '—'}</span></div>
      <div class="field"><span class="fl">Dirección</span><span class="fv">${p.direccion || '—'}</span></div>
    </div>

    ${p.foto_local_url ? `
    <div class="section">
      <div class="slabel">Foto del Local</div>
      <img src="${p.foto_local_url}" alt="Frente del local" />
    </div>
    ` : ''}

    <div class="footer">
      <span>Mi Pasador — Gestión de Comercios</span>
      <span>${hoy}</span>
    </div>
  `;
}

function handlePrint(p: PostulacionComercio) {
  const win = window.open('', '_blank', 'width=860,height=1080');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Ficha — ${p.nombre_negocio || p.id}</title><style>${PRINT_CSS}</style></head><body>${buildPrintHTML(p)}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

const estadoBadge: Record<string, string> = {
  pendiente: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  aceptada: 'bg-green-50 text-green-800 border border-green-200',
  denegada: 'bg-red-50 text-red-800 border border-red-200',
  requiere_modificacion: 'bg-purple-50 text-purple-800 border border-purple-200',
};

interface Props {
  postulacion: PostulacionComercio;
  onClose: () => void;
  onRefresh: () => void;
}

export function FichaComercioModal({ postulacion: p, onClose, onRefresh }: Props) {
  const [view, setView] = useState<'main' | 'mod'>('main');
  const [campos, setCampos] = useState<string[]>([]);
  const [observacion, setObservacion] = useState('');
  const [processing, setProcessing] = useState(false);

  const isPending = p.estado === 'pendiente';

  const toggleCampo = (key: string) =>
    setCampos(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  async function handleAccept() {
    setProcessing(true);
    try {
      await acceptPostulacionComercio(p.id);
      onRefresh(); onClose();
    } catch { alert('Error al aceptar'); }
    finally { setProcessing(false); }
  }

  async function handleDeny() {
    setProcessing(true);
    try {
      await denyPostulacionComercio(p.id);
      onRefresh(); onClose();
    } catch { alert('Error al denegar'); }
    finally { setProcessing(false); }
  }

  async function handleRequestMod() {
    if (campos.length === 0) return;
    setProcessing(true);
    try {
      await requestModificationComercio(p.id, p.wa_user_id, campos, observacion);
      onRefresh(); onClose();
    } catch { alert('Error al enviar la solicitud'); }
    finally { setProcessing(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400">
            Ficha de Postulación · Comercio
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
          {/* Header */}
          <div className="flex justify-between items-end border-b-2 border-gray-900 pb-4 mb-7">
            <div>
              <h1 className="text-xl font-light tracking-[0.06em] uppercase text-gray-900">
                Postulación de Comercio
              </h1>
              <p className="text-[10px] text-gray-400 mt-1">ID: {p.id}</p>
            </div>
            <div className="text-right text-[10px] text-gray-400">
              <p>{p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</p>
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
                {p.correcciones && (
                  <div className="flex gap-3">
                    <dt className="text-[11px] text-gray-400 w-40 shrink-0">Correcciones</dt>
                    <dd className="text-[12px] text-purple-700 whitespace-pre-line">{p.correcciones}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Negocio */}
            <section>
              <h2 className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 border-b border-gray-100 pb-1.5 mb-3">
                Negocio
              </h2>
              <dl className="space-y-2.5">
                {[
                  ['Nombre del negocio', p.nombre_negocio],
                  ['Categoría', p.categoria_productos],
                  ['Dirección', p.direccion],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="text-[11px] text-gray-400 w-40 shrink-0">{label}</dt>
                    <dd className="text-[13px] font-medium text-gray-900">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Foto */}
            {p.foto_local_url && (
              <section>
                <h2 className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 border-b border-gray-100 pb-1.5 mb-3">
                  Foto del Local
                </h2>
                <img
                  src={p.foto_local_url}
                  alt="Frente del local"
                  className="max-h-60 rounded-lg border border-gray-100 object-cover"
                />
              </section>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/70 rounded-b-2xl">
          {view === 'main' ? (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                {!isPending ? `Esta postulación ya fue ${p.estado}` : 'Revisá la ficha antes de actuar'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('mod')}
                  disabled={!isPending || processing}
                  className="px-3.5 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Pedir modificación
                </button>
                <button
                  onClick={handleDeny}
                  disabled={!isPending || processing}
                  className="px-3.5 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Denegar
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!isPending || processing}
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
                      className="rounded border-gray-300 text-gray-800"
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
                  onClick={handleRequestMod}
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
