import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

function BatchPanel({ pendientes, token, onComplete }) {
  const [emitiendo, setEmitiendo] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [log, setLog] = useState([]);
  const [completado, setCompletado] = useState(false);
  const [sunatError, setSunatError] = useState(null);
  const socketRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Scroll solo dentro del contenedor de log, no la pagina
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const iniciarBatch = async () => {
    setSunatError(null);
    setVerificando(true);

    try {
      const res = await fetch('/sunat/status');
      const data = await res.json();
      if (!data.sunat?.online) {
        setSunatError('SUNAT no esta disponible en este momento. Los comprobantes no seran enviados para evitar errores. Intente mas tarde.');
        setVerificando(false);
        return;
      }
    } catch {
      setSunatError('No se pudo verificar el estado de SUNAT. Verifique su conexion e intente nuevamente.');
      setVerificando(false);
      return;
    }

    setVerificando(false);
    setEmitiendo(true);
    setProgreso(null);
    setLog([]);
    setCompletado(false);

    const socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      const ids = [...pendientes].sort((a, b) => a.id - b.id).map((c) => c.id);
      socket.emit('emitir-batch', ids);
    });

    socket.on('batch-progreso', (data) => {
      setProgreso(data);
      const item = data.actual;
      if (item.status === 'polling') {
        // Actualizar ultimo item del log en vez de agregar nuevo
        setLog((prev) => {
          const updated = [...prev];
          const lastIdx = updated.findIndex((l) => l.id === item.id);
          if (lastIdx >= 0) updated[lastIdx] = item;
          else updated.push(item);
          return updated;
        });
      } else {
        setLog((prev) => {
          // Reemplazar si ya existia un polling para este id
          const idx = prev.findIndex((l) => l.id === item.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = item;
            return updated;
          }
          return [...prev, item];
        });
      }
    });

    socket.on('batch-completado', (data) => {
      setCompletado(true);
      setEmitiendo(false);
      setProgreso((prev) => ({ ...prev, ...data }));
      socket.disconnect();
      onComplete();
    });

    socket.on('batch-error', (data) => {
      setSunatError(data.message);
      setEmitiendo(false);
      socket.disconnect();
    });

    socket.on('connect_error', () => {
      setEmitiendo(false);
      setLog((prev) => [...prev, { status: 'error', message: 'Error de conexion con el servidor' }]);
    });
  };

  const porcentaje = progreso
    ? Math.round((progreso.procesados / progreso.total) * 100)
    : 0;

  const getIcon = (status) => {
    if (status === 'ok') return '\u2713';
    if (status === 'error') return '\u2717';
    if (status === 'polling') return '\u25CF';
    return '\u25CB';
  };

  const getIconClass = (status) => {
    if (status === 'ok') return 'icon-ok';
    if (status === 'error') return 'icon-error';
    if (status === 'polling') return 'icon-polling';
    return 'icon-skip';
  };

  const getMessage = (item) => {
    if (item.status === 'ok') {
      return `Comprobante #${item.id} - ${item.numero} - ${item.estado_sunat || 'ACEPTADO'}`;
    }
    if (item.status === 'polling') {
      return item.message;
    }
    if (item.status === 'skip') {
      return `Comprobante #${item.id} omitido`;
    }
    const prefix = item.numero ? `${item.numero} - ` : '';
    const estadoTag = item.estado_sunat ? `${item.estado_sunat}: ` : '';
    return `Comprobante #${item.id} - ${prefix}${estadoTag}${item.message}`;
  };

  return (
    <div className="batch-panel">
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Emision por lote ({pendientes.length} pendientes)</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={iniciarBatch}
          disabled={emitiendo || verificando || pendientes.length === 0}
        >
          {verificando ? 'Verificando SUNAT...' : emitiendo ? 'Emitiendo...' : 'Emitir todos'}
        </button>
      </h3>

      {sunatError && (
        <div
          style={{
            marginTop: 12,
            padding: '12px 16px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: '#856404',
            fontWeight: 500,
          }}
        >
          {sunatError}
        </div>
      )}

      {progreso && (
        <>
          <div className="progress-bar-container" style={{ marginTop: 14 }}>
            <div className="progress-bar" style={{ width: `${porcentaje}%` }}>
              {porcentaje}%
            </div>
          </div>

          <div className="batch-stats">
            <div>
              Procesados: <span>{progreso.procesados}/{progreso.total}</span>
            </div>
            <div>
              Exitosos: <span className="icon-ok">{progreso.exitosos}</span>
            </div>
            <div>
              Fallidos: <span className="icon-error">{progreso.fallidos}</span>
            </div>
          </div>
        </>
      )}

      {log.length > 0 && (
        <div className="batch-log" ref={logRef}>
          {log.map((item, i) => (
            <div className="batch-log-item" key={i}>
              <span className={getIconClass(item.status)}>
                {getIcon(item.status)}
              </span>
              <span>
                {getMessage(item)}
                {item.status === 'error' && item.response && (
                  <details style={{ marginTop: 4, fontSize: '0.75rem', color: '#666' }}>
                    <summary>Ver respuesta completa</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '4px 0' }}>
                      {JSON.stringify(item.response, null, 2)}
                    </pre>
                  </details>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {completado && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: '#d4edda',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: '#155724',
            fontWeight: 600,
          }}
        >
          Proceso completado - {progreso.exitosos} emitidos, {progreso.fallidos} fallidos
        </div>
      )}
    </div>
  );
}

export default BatchPanel;
