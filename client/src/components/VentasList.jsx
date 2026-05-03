import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const VentasList = forwardRef(function VentasList(
  { api, onSelectVenta, ventaSeleccionada, onBoletasMasivas },
  ref
) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [creando, setCreando] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState({ total: 0, actual: 0 });

  const cargarVentas = async () => {
    setLoading(true);
    const data = await api(`/ventas?fecha=${fecha}`);
    if (data.ok) setVentas(data.ventas);
    setLoading(false);
  };

  useImperativeHandle(ref, () => ({ cargarVentas }));

  useEffect(() => {
    cargarVentas();
  }, [fecha]);

  // Ventas < 700 que aun tienen monto pendiente de facturar
  const ventasParaBoleta = ventas.filter((v) => {
    const pendiente = v.total_importe - v.total_comprobantes;
    return v.total_importe < 700 && pendiente > 0;
  });

  const totalBoletas = ventasParaBoleta.reduce((sum, v) => sum + (v.total_importe - v.total_comprobantes), 0);

  const handleConfirmar = async () => {
    setShowConfirm(false);
    setCreando(true);
    setProgresoCarga({ total: ventasParaBoleta.length, actual: 0 });

    await onBoletasMasivas(ventasParaBoleta, fecha, (actual) => {
      setProgresoCarga((prev) => ({ ...prev, actual }));
    });

    setCreando(false);
    cargarVentas();
  };

  const porcentajeCarga = progresoCarga.total
    ? Math.round((progresoCarga.actual / progresoCarga.total) * 100)
    : 0;

  return (
    <div>
      <div className="filter-bar">
        <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Fecha:</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <button className="btn btn-outline btn-sm" onClick={cargarVentas}>
          Buscar
        </button>
        {ventasParaBoleta.length > 0 && (
          <button
            className="btn btn-sm"
            style={{ background: '#7209b7', color: '#fff' }}
            onClick={() => setShowConfirm(true)}
            disabled={creando}
          >
            Boletas menores a S/ 700
          </button>
        )}
        <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: 'auto' }}>
          {ventas.length} ventas
        </span>
      </div>

      <div className="table-container">
        <h3>Ventas del {fecha}</h3>
        {loading ? (
          <div className="empty-state">Cargando...</div>
        ) : ventas.length === 0 ? (
          <div className="empty-state">No hay ventas para esta fecha</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th className="text-right">Neto (kg)</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Importe</th>
                  <th className="text-right">Comprobantes</th>
                  <th className="text-right">Pendiente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => {
                  const pendiente = (v.total_importe - v.total_comprobantes).toFixed(2);
                  const isSelected = ventaSeleccionada?.id === v.id;
                  return (
                    <tr
                      key={v.id}
                      style={{
                        background: isSelected ? '#eef2ff' : undefined,
                        cursor: 'pointer',
                      }}
                      onClick={() => onSelectVenta(v)}
                    >
                      <td>{v.id}</td>
                      <td>{v.cliente_nombre}</td>
                      <td>{v.producto_nombre}</td>
                      <td className="text-right">{v.total_neto}</td>
                      <td className="text-right">S/ {Number(v.precio).toFixed(2)}</td>
                      <td className="text-right">
                        <strong>S/ {Number(v.total_importe).toFixed(2)}</strong>
                      </td>
                      <td className="text-right">S/ {Number(v.total_comprobantes).toFixed(2)}</td>
                      <td className="text-right">
                        <span
                          style={{
                            color: pendiente > 0 ? '#e63946' : '#2ec4b6',
                            fontWeight: 600,
                          }}
                        >
                          S/ {pendiente}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVenta(v);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h3>Crear boletas menores a S/ 700</h3>
            <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 12 }}>
              Se crearan <strong>{ventasParaBoleta.length} boletas</strong> con cliente
              <strong> CLIENTES VARIOS</strong> (DNI 00000000) por el monto pendiente de cada venta.
              Total: <strong>S/ {totalBoletas.toFixed(2)}</strong>
            </p>

            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th className="text-right">Importe</th>
                    <th className="text-right">Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasParaBoleta.map((v) => (
                    <tr key={v.id}>
                      <td>#{v.id}</td>
                      <td>{v.cliente_nombre}</td>
                      <td>{v.producto_nombre}</td>
                      <td className="text-right">S/ {Number(v.total_importe).toFixed(2)}</td>
                      <td className="text-right">
                        S/ {(v.total_importe - v.total_comprobantes).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                style={{ background: '#7209b7', color: '#fff' }}
                onClick={handleConfirmar}
              >
                Crear {ventasParaBoleta.length} boletas
              </button>
            </div>
          </div>
        </div>
      )}

      {creando && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <h3>Creando boletas...</h3>
            <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 16 }}>
              {progresoCarga.actual} de {progresoCarga.total}
            </p>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${porcentajeCarga}%` }}>
                {porcentajeCarga}%
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: 12 }}>
              No cierre esta ventana
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default VentasList;
