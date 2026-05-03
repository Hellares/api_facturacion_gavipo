function getBadgeClass(estado, estadoSunat) {
  if (estado === 'pendiente') return 'badge-pending';
  if (estado === 'rechazado') return 'badge-rechazado';
  if (estado === 'error') return 'badge-error';
  // emitido - depende del estado_sunat
  if (['ACEPTADO'].includes(estadoSunat)) return 'badge-aceptado';
  if (['RECHAZADO'].includes(estadoSunat)) return 'badge-rechazado';
  if (['ERROR'].includes(estadoSunat)) return 'badge-error';
  return 'badge-emitido'; // EN_COLA, ENVIANDO, etc
}

function getBadgeLabel(estado, estadoSunat) {
  if (estado === 'pendiente') return 'PENDIENTE';
  if (estado === 'rechazado') return 'RECHAZADO';
  if (estado === 'error') return 'ERROR';
  return estadoSunat || 'EMITIDO';
}

function ComprobantesPanel({ venta, comprobantes, onCrear, onEditar, onEliminar }) {
  const totalComprobantes = comprobantes
    .filter((c) => c.estado !== 'error')
    .reduce((sum, c) => sum + c.importe, 0);
  const pendiente = (venta.total_importe - totalComprobantes).toFixed(2);

  return (
    <div>
      <div className="venta-selected">
        <strong>Venta #{venta.id}</strong> - {venta.cliente_nombre} |{' '}
        {venta.producto_nombre} | Neto: {venta.total_neto} kg | Precio: S/{' '}
        {Number(venta.precio).toFixed(2)} | <strong>Total: S/ {Number(venta.total_importe).toFixed(2)}</strong>
      </div>

      <div className={`remaining ${pendiente <= 0 ? 'complete' : ''}`}>
        {pendiente > 0
          ? `Pendiente de facturar: S/ ${pendiente}`
          : 'Monto total cubierto con comprobantes'}
      </div>

      <div className="table-container">
        <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Comprobantes ({comprobantes.length})</span>
          {pendiente > 0 && (
            <button className="btn btn-success btn-sm" onClick={onCrear}>
              + Nuevo comprobante
            </button>
          )}
        </h3>

        {comprobantes.length === 0 ? (
          <div className="empty-state">
            No hay comprobantes para esta venta
            <br />
            <button
              className="btn btn-success btn-sm"
              style={{ marginTop: 12 }}
              onClick={onCrear}
            >
              Crear primer comprobante
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Doc. Cliente</th>
                  <th>Razon Social</th>
                  <th className="text-right">Cantidad (kg)</th>
                  <th className="text-right">P. Unit.</th>
                  <th className="text-right">Importe</th>
                  <th>Estado</th>
                  <th>N. Comprobante</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comprobantes.map((c) => (
                  <tr key={c.id}>
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
                    <td>{c.numero_documento_cliente}</td>
                    <td>{c.razon_social_cliente}</td>
                    <td className="text-right">{c.cantidad}</td>
                    <td className="text-right">S/ {Number(c.precio_unitario).toFixed(2)}</td>
                    <td className="text-right">
                      <strong>S/ {Number(c.importe).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(c.estado, c.estado_sunat)}`}>
                        {getBadgeLabel(c.estado, c.estado_sunat)}
                      </span>
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
                    <td className="actions-cell">
                      {c.estado !== 'emitido' && (
                        <>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => onEditar(c)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => onEliminar(c.id)}
                          >
                            Eliminar
                          </button>
                        </>
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

export default ComprobantesPanel;
