import { useState, useEffect, useCallback, useRef } from 'react';
import Login from './components/Login';
import VentasList from './components/VentasList';
import ComprobantesPanel from './components/ComprobantesPanel';
import ComprobanteForm from './components/ComprobanteForm';
import ComprobantesListView from './components/ComprobantesListView';
import Toast from './components/Toast';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('ventas');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [comprobantes, setComprobantes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const ventasListRef = useRef(null);

  const api = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-token': token,
        ...options.headers,
      },
    });
    return res.json();
  }, [token]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!ventaSeleccionada || !token) return;
    api(`/comprobantes/venta/${ventaSeleccionada.id}`).then((data) => {
      if (data.ok) setComprobantes(data.comprobantes);
    });
  }, [ventaSeleccionada, token, refreshKey, api]);

  const handleLogin = (tkn, usr) => {
    setToken(tkn);
    setUser(usr);
    localStorage.setItem('token', tkn);
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    setVentaSeleccionada(null);
    setComprobantes([]);
  };

  const handleCrearComprobante = async (formData) => {
    const data = await api('/comprobantes', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    if (data.ok) {
      showToast('Comprobante creado');
      setShowForm(false);
      refresh();
      ventasListRef.current?.cargarVentas();
    } else {
      showToast(data.message || 'Error al crear', 'error');
    }
  };

  const handleEditarComprobante = async (formData) => {
    const data = await api(`/comprobantes/${editando.id}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    });
    if (data.ok) {
      showToast('Comprobante actualizado');
      setEditando(null);
      setShowForm(false);
      refresh();
      ventasListRef.current?.cargarVentas();
    } else {
      showToast(data.message || 'Error al editar', 'error');
    }
  };

  const handleBoletasMasivas = async (ventasParaBoleta, fecha, onProgreso) => {
    let creadas = 0;
    let errores = 0;
    for (let i = 0; i < ventasParaBoleta.length; i++) {
      const v = ventasParaBoleta[i];
      const data = await api('/comprobantes', {
        method: 'POST',
        body: JSON.stringify({
          venta_id: v.id,
          tipo_comprobante: 'boleta',
          fecha_emision: fecha,
          tipo_documento_cliente: '1',
          numero_documento_cliente: '00000000',
          razon_social_cliente: 'CLIENTES VARIOS',
          direccion_cliente: '',
          codigo_producto: String(v.producto_id),
          descripcion_producto: v.producto_nombre,
          cantidad: v.total_neto,
          precio_unitario: v.precio,
          observacion: 'Boleta masiva < S/ 700',
        }),
      });
      if (data.ok) creadas++;
      else errores++;
      onProgreso(i + 1);
    }
    showToast(`${creadas} boletas creadas${errores ? `, ${errores} errores` : ''}`, errores ? 'error' : 'success');
    refresh();
  };

  const handleEliminar = async (id) => {
    const data = await api(`/comprobantes/${id}`, { method: 'DELETE' });
    if (data.ok) {
      showToast('Comprobante eliminado');
      refresh();
      ventasListRef.current?.cargarVentas();
    } else {
      showToast(data.message || 'Error al eliminar', 'error');
    }
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Facturacion GAVIPO</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && <span style={{ fontSize: '0.85rem' }}>{user.nombre}</span>}
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${tab === 'ventas' ? 'tab-active' : ''}`}
          onClick={() => setTab('ventas')}
        >
          Ventas y Comprobantes
        </button>
        <button
          className={`tab ${tab === 'comprobantes' ? 'tab-active' : ''}`}
          onClick={() => setTab('comprobantes')}
        >
          Emision de Comprobantes
        </button>
      </div>

      {tab === 'ventas' && (
        <div className="panels">
          <div>
            <VentasList
              ref={ventasListRef}
              api={api}
              onSelectVenta={(v) => {
                setVentaSeleccionada(v);
                setComprobantes([]);
                refresh();
              }}
              ventaSeleccionada={ventaSeleccionada}
              onBoletasMasivas={handleBoletasMasivas}
            />
          </div>
          <div className="panel-right-sticky">
            {ventaSeleccionada ? (
              <ComprobantesPanel
                venta={ventaSeleccionada}
                comprobantes={comprobantes}
                onCrear={() => {
                  setEditando(null);
                  setShowForm(true);
                }}
                onEditar={(c) => {
                  setEditando(c);
                  setShowForm(true);
                }}
                onEliminar={handleEliminar}
              />
            ) : (
              <div className="table-container">
                <div className="empty-state">
                  Selecciona una venta para ver y crear comprobantes
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'comprobantes' && (
        <ComprobantesListView api={api} token={token} showToast={showToast} />
      )}

      {showForm && ventaSeleccionada && (
        <ComprobanteForm
          venta={ventaSeleccionada}
          comprobantes={comprobantes}
          editando={editando}
          onSubmit={editando ? handleEditarComprobante : handleCrearComprobante}
          onClose={() => {
            setShowForm(false);
            setEditando(null);
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

export default App;
