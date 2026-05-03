import { useState, useEffect } from 'react';
import BatchPanel from './BatchPanel';

function getBadgeClass(estado, estadoSunat) {
  if (estado === 'pendiente') return 'badge-pending';
  if (estado === 'rechazado') return 'badge-rechazado';
  if (estado === 'error') return 'badge-error';
  if (['ACEPTADO'].includes(estadoSunat)) return 'badge-aceptado';
  if (['RECHAZADO'].includes(estadoSunat)) return 'badge-rechazado';
  if (['ERROR'].includes(estadoSunat)) return 'badge-error';
  return 'badge-emitido';
}

function getBadgeLabel(estado, estadoSunat) {
  if (estado === 'pendiente') return 'PENDIENTE';
  if (estado === 'rechazado') return 'RECHAZADO';
  if (estado === 'error') return 'ERROR';
  return estadoSunat || 'EMITIDO';
}

function ComprobantesListView({ api, token, showToast }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState('');
  const [cliente, setCliente] = useState('');
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());

  const cargar = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (estado) params.append('estado', estado);
    if (cliente) params.append('cliente', cliente);
    const data = await api(`/comprobantes/todos?${params}`);
    if (data.ok) setComprobantes(data.comprobantes);
    setSeleccionados(new Set());
    setLoading(false);
  };

  const sincronizarEstados = async () => {
    setSyncing(true);
    try {
      const data = await api('/comprobantes/sync-estados', { method: 'POST' });
      if (data.actualizados > 0) {
        showToast(`${data.actualizados} comprobantes actualizados`);
        await cargar();
      }
    } catch { /* ignore */ }
    setSyncing(false);
  };

  useEffect(() => {
    // Al montar, sincronizar estados pendientes y luego cargar
    sincronizarEstados().then(() => cargar());
  }, []);

  const pendientes = comprobantes.filter((c) => c.estado === 'pendiente');
  const pendientesSeleccionados = comprobantes.filter(
    (c) => seleccionados.has(c.id) && c.estado === 'pendiente'
  );

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (pendientes.every((c) => seleccionados.has(c.id))) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(pendientes.map((c) => c.id)));
    }
  };

  const todosSeleccionados = pendientes.length > 0 && pendientes.every((c) => seleccionados.has(c.id));

  return (
    <div>
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Fecha:</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Estado:</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem' }}
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="emitido">Emitido</option>
          <option value="rechazado">Rechazado</option>
          <option value="error">Error</option>
        </select>
        <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Cliente:</label>
        <input
          type="text"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Buscar cliente..."
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem' }}
        />
        <button className="btn btn-primary btn-sm" onClick={cargar}>
          Buscar
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={sincronizarEstados}
          disabled={syncing}
          title="Consultar estado actual en SUNAT de comprobantes en cola"
        >
          {syncing ? 'Sincronizando...' : 'Sync SUNAT'}
        </button>
        <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: 'auto' }}>
          {comprobantes.length} comprobantes
        </span>
      </div>

      {pendientesSeleccionados.length > 0 && (
        <BatchPanel
          pendientes={pendientesSeleccionados}
          token={token}
          onComplete={() => {
            showToast('Batch completado');
            cargar();
          }}
        />
      )}

      {!pendientesSeleccionados.length && pendientes.length > 0 && (
        <div
          style={{
            background: '#fff3cd',
            padding: '10px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.85rem',
            color: '#856404',
          }}
        >
          Selecciona comprobantes pendientes para emitirlos en batch
        </div>
      )}

      <div className="table-container">
        <h3>Comprobantes</h3>
        {loading ? (
          <div className="empty-state">Cargando...</div>
        ) : comprobantes.length === 0 ? (
          <div className="empty-state">No se encontraron comprobantes</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={toggleTodos}
                      title="Seleccionar todos los pendientes"
                    />
                  </th>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Cliente (Venta)</th>
                  <th>Doc. Cliente</th>
                  <th>Razon Social</th>
                  <th>Producto</th>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">P.Unit.</th>
                  <th className="text-right">Importe</th>
                  <th>Estado</th>
                  <th>N. Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {comprobantes.map((c) => (
                  <tr key={c.id}>
                    <td className="checkbox-cell">
                      {c.estado === 'pendiente' && (
                        <input
                          type="checkbox"
                          checked={seleccionados.has(c.id)}
                          onChange={() => toggleSeleccion(c.id)}
                        />
                      )}
                    </td>
                    <td>{c.id}</td>
                    <td>
                      <span
                        style={{
                          textTransform: 'capitalize',
                          fontWeight: 600,
                          color: c.tipo_comprobante === 'factura' ? '#4361ee' : '#7209b7',
                        }}
                      >
                        {c.tipo_comprobante}
                      </span>
                    </td>
                    <td>{c.venta?.cliente_nombre || '-'}</td>
                    <td>{c.numero_documento_cliente}</td>
                    <td>{c.razon_social_cliente}</td>
                    <td>{c.descripcion_producto}</td>
                    <td className="text-right">{c.cantidad}</td>
                    <td className="text-right">S/ {Number(c.precio_unitario).toFixed(2)}</td>
                    <td className="text-right">
                      <strong>S/ {Number(c.importe).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(c.estado, c.estado_sunat)}`}>
                        {getBadgeLabel(c.estado, c.estado_sunat)}
                      </span>
                      {c.estado === 'error' && c.error_mensaje && (
                        <div style={{ fontSize: '0.7rem', color: '#e63946', marginTop: 2 }}>
                          {(() => {
                            try {
                              const parsed = JSON.parse(c.error_mensaje);
                              return parsed.message || c.error_mensaje;
                            } catch {
                              return c.error_mensaje;
                            }
                          })()}
                        </div>
                      )}
                    </td>
                    <td>
                      {c.numero_completo || '-'}
                      {c.pdf_url && (
                        <a
                          href={c.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginLeft: 8,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#fff',
                            background: '#e63946',
                            padding: '2px 8px',
                            borderRadius: 4,
                            textDecoration: 'none',
                            display: 'inline-block',
                            letterSpacing: '0.5px',
                          }}
                        >
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComprobantesListView;
