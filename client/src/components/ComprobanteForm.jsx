import { useState, useRef } from 'react';

function ComprobanteForm({ venta, comprobantes, onSubmit, onClose, editando }) {
  const totalExistente = comprobantes
    .filter((c) => c.estado !== 'error' && (!editando || c.id !== editando.id))
    .reduce((sum, c) => sum + c.importe, 0);
  const disponible = parseFloat((venta.total_importe - totalExistente).toFixed(2));

  const [form, setForm] = useState({
    venta_id: venta.id,
    tipo_comprobante: editando?.tipo_comprobante || 'boleta',
    fecha_emision: editando?.fecha_emision || new Date().toISOString().split('T')[0],
    tipo_documento_cliente: editando?.tipo_documento_cliente || '1',
    numero_documento_cliente: editando?.numero_documento_cliente || '',
    razon_social_cliente: editando?.razon_social_cliente || '',
    direccion_cliente: editando?.direccion_cliente || '',
    codigo_producto: editando?.codigo_producto || String(venta.producto_id),
    descripcion_producto: editando?.descripcion_producto || venta.producto_nombre,
    cantidad: editando?.cantidad || '',
    precio_unitario: editando?.precio_unitario || venta.precio,
  });

  const [consultando, setConsultando] = useState(false);
  const [consultaError, setConsultaError] = useState('');
  const consultaRef = useRef(null);

  const importe = form.cantidad
    ? parseFloat((parseFloat(form.cantidad) * parseFloat(form.precio_unitario)).toFixed(2))
    : 0;

  const excede = importe > disponible;

  const consultarDocumento = async (tipoDoc, numero) => {
    if (tipoDoc === '1' && numero.length !== 8) return;
    if (tipoDoc === '6' && numero.length !== 11) return;
    if (!['1', '6'].includes(tipoDoc)) return;

    // Cancelar consulta anterior
    if (consultaRef.current) consultaRef.current.abort();
    const controller = new AbortController();
    consultaRef.current = controller;

    setConsultando(true);
    setConsultaError('');

    try {
      const tipo = tipoDoc === '1' ? 'dni' : 'ruc';
      const res = await fetch(`/consulta/${tipo}/${numero}`, { signal: controller.signal });
      const data = await res.json();

      if (data.success && data.data) {
        const nombre = tipoDoc === '1'
          ? data.data.nombre_completo
          : data.data.nombre_o_razon_social || data.data.razon_social || data.data.nombre_completo;
        const direccion = tipoDoc === '6'
          ? data.data.direccion || data.data.direccion_completa || ''
          : data.data.direccion_completa || '';

        setForm((prev) => ({
          ...prev,
          razon_social_cliente: nombre || prev.razon_social_cliente,
          direccion_cliente: direccion || prev.direccion_cliente,
        }));
      } else {
        setConsultaError('No se encontro el documento');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setConsultaError('Error al consultar');
      }
    }
    setConsultando(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'tipo_comprobante' && value === 'factura') {
        updated.tipo_documento_cliente = '6';
      }
      // Limpiar campos al cambiar tipo de documento
      if (name === 'tipo_documento_cliente') {
        updated.numero_documento_cliente = '';
        updated.razon_social_cliente = '';
        updated.direccion_cliente = '';
      }
      return updated;
    });

    // Auto-consultar al completar DNI o RUC
    if (name === 'numero_documento_cliente') {
      consultarDocumento(form.tipo_documento_cliente, value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (excede) return;
    onSubmit({
      ...form,
      cantidad: parseFloat(form.cantidad),
      precio_unitario: parseFloat(form.precio_unitario),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editando ? `Editar Comprobante #${editando.id}` : `Nuevo Comprobante - Venta #${venta.id}`}</h3>

        <div className={`remaining ${disponible <= 0 ? 'complete' : ''}`}>
          Disponible: S/ {disponible.toFixed(2)}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Tipo comprobante</label>
              <select
                name="tipo_comprobante"
                value={form.tipo_comprobante}
                onChange={handleChange}
              >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha emision</label>
              <input
                type="date"
                name="fecha_emision"
                value={form.fecha_emision}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div className="form-group">
              <label>Tipo doc.</label>
              <select
                name="tipo_documento_cliente"
                value={form.tipo_documento_cliente}
                onChange={handleChange}
              >
                <option value="1">DNI</option>
                <option value="6">RUC</option>
                <option value="4">CE</option>
                <option value="0">Otros</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                N. documento
                {consultando && (
                  <span style={{ color: '#4361ee', fontWeight: 400, marginLeft: 8 }}>
                    Consultando...
                  </span>
                )}
                {consultaError && (
                  <span style={{ color: '#e63946', fontWeight: 400, marginLeft: 8 }}>
                    {consultaError}
                  </span>
                )}
              </label>
              <input
                type="text"
                name="numero_documento_cliente"
                value={form.numero_documento_cliente}
                onChange={handleChange}
                required
                maxLength={15}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Razon social / Nombre</label>
            <input
              type="text"
              name="razon_social_cliente"
              value={form.razon_social_cliente}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Direccion (opcional)</label>
            <input
              type="text"
              name="direccion_cliente"
              value={form.direccion_cliente}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Descripcion producto</label>
              <input
                type="text"
                name="descripcion_producto"
                value={form.descripcion_producto}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Codigo producto</label>
              <input
                type="text"
                name="codigo_producto"
                value={form.codigo_producto}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Cantidad (kg)</label>
              <input
                type="number"
                name="cantidad"
                value={form.cantidad}
                onChange={handleChange}
                required
                step="0.01"
                min="0.01"
              />
            </div>
            <div className="form-group">
              <label>Precio unit. (con IGV)</label>
              <input
                type="number"
                name="precio_unitario"
                value={form.precio_unitario}
                onChange={handleChange}
                required
                step="0.01"
                min="0.01"
              />
            </div>
            <div className="form-group">
              <label>Importe</label>
              <input
                type="text"
                value={`S/ ${importe.toFixed(2)}`}
                readOnly
                style={{
                  background: excede ? '#f8d7da' : '#f8f9fa',
                  color: excede ? '#721c24' : '#333',
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          {excede && (
            <div style={{ color: '#e63946', fontSize: '0.82rem', marginBottom: 8 }}>
              El importe excede el monto disponible (S/ {disponible.toFixed(2)})
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={excede || !form.cantidad || importe <= 0}
            >
              {editando ? 'Guardar cambios' : 'Crear comprobante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ComprobanteForm;
