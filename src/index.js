import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './sequelize.js';
import { Comprobante } from './models/index.js';
import authRoutes from './routes/auth.js';
import comprobantesRoutes from './routes/comprobantes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rutas
app.use('/auth', authRoutes);
app.use('/comprobantes', comprobantesRoutes);

// Ruta para obtener ventas por fecha
app.get('/ventas', async (req, res) => {
    const { fecha } = req.query;
    try {
        let where = '';
        let replacements = [];
        if (fecha) {
            where = 'WHERE DATE(orden_date) = ?';
            replacements = [fecha];
        }
        const [ventas] = await sequelize.query(
            `SELECT v.*,
                COALESCE((SELECT SUM(c.importe) FROM comprobantes_beta c WHERE c.venta_id = v.id AND c.estado IN ('pendiente','emitido','rechazado')), 0) as total_comprobantes
             FROM ventas v ${where} ORDER BY v.id DESC`,
            { replacements }
        );
        res.json({ ok: true, ventas });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// Consulta DNI/RUC via Factiliza
const FACTILIZA_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMzciLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJjb25zdWx0b3IifQ.Mi4bxZChCuNt4uH2-_jy7z37GPLnBhEqtH2IfvlK-6M';

app.get('/consulta/dni/:numero', async (req, res) => {
    try {
        const r = await fetch(`https://api.factiliza.com/v1/dni/info/${req.params.numero}`, {
            headers: { 'Authorization': `Bearer ${FACTILIZA_TOKEN}` },
        });
        const data = await r.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/consulta/ruc/:numero', async (req, res) => {
    try {
        const r = await fetch(`https://api.factiliza.com/v1/ruc/info/${req.params.numero}`, {
            headers: { 'Authorization': `Bearer ${FACTILIZA_TOKEN}` },
        });
        const data = await r.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verificar disponibilidad de SUNAT
const SUNAT_URL = 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService';

async function verificarSunat() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(SUNAT_URL, {
            method: 'GET',
            signal: controller.signal,
        });
        clearTimeout(timeout);
        // SUNAT responde (cualquier status significa que esta online)
        return { online: true, status: res.status };
    } catch (err) {
        console.error('[SUNAT CHECK] No se pudo conectar a SUNAT:', err.message);
        return { online: false, error: err.message };
    }
}

app.get('/sunat/status', async (req, res) => {
    const result = await verificarSunat();
    res.json({ ok: true, sunat: result });
});

// Configuracion Syncrofact (estatica por ahora)
const SYNCROFACT_BASE_URL = 'https://beta.syncrofact.net.pe/api';
const SYNCROFACT_TOKEN = process.env.SYNCROFACT_TOKEN || '';
const COMPANY_ID = parseInt(process.env.SYNCROFACT_COMPANY_ID) || 1;
const BRANCH_ID = parseInt(process.env.SYNCROFACT_BRANCH_ID) || 1;
const SERIE_FACTURA = process.env.SYNCROFACT_SERIE_FACTURA || 'F001';
const SERIE_BOLETA = process.env.SYNCROFACT_SERIE_BOLETA || 'B001';

// Polling del estado SUNAT en Syncrofact
async function consultarEstadoSyncrofact(syncrofactId, esBoleta) {
    const endpoint = esBoleta
        ? `/v1/boletas/${syncrofactId}`
        : `/v1/invoices/${syncrofactId}`;

    const res = await fetch(`${SYNCROFACT_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${SYNCROFACT_TOKEN}` },
    });
    const data = await res.json();
    console.log(`[CONSULTA] #${syncrofactId} respuesta:`, JSON.stringify(data.data?.estado_sunat), JSON.stringify(data.data?.respuesta_sunat || data.data?.sunat || ''));
    return data.data;
}

async function pollEstadoSunat(syncrofactId, esBoleta, maxIntentos = 10) {
    for (let i = 0; i < maxIntentos; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
            const docData = await consultarEstadoSyncrofact(syncrofactId, esBoleta);
            const estado = docData?.estado_sunat;
            if (['ACEPTADO', 'RECHAZADO', 'ERROR'].includes(estado)) {
                return docData;
            }
            console.log(`[POLLING] #${syncrofactId} intento ${i + 1}: ${estado}`);
        } catch (err) {
            console.error(`[POLLING] #${syncrofactId} error:`, err.message);
        }
    }
    return null; // timeout - no llego a estado terminal
}

// Endpoint para sincronizar estados de comprobantes emitidos con estado no final
app.post('/comprobantes/sync-estados', async (req, res) => {
    try {
        const { Op } = await import('sequelize');
        const comprobantes = await Comprobante.findAll({
            where: {
                estado: 'emitido',
                syncrofact_id: { [Op.ne]: null },
                estado_sunat: { [Op.notIn]: ['ACEPTADO', 'RECHAZADO', 'ERROR'] },
            },
        });

        console.log(`[SYNC] Encontrados ${comprobantes.length} comprobantes con estado no final`);
        let actualizados = 0;

        for (const comp of comprobantes) {
            try {
                const esBoleta = comp.tipo_comprobante === 'boleta';
                const docData = await consultarEstadoSyncrofact(comp.syncrofact_id, esBoleta);

                if (!docData) continue;

                const updateData = { estado_sunat: docData.estado_sunat };
                const sunatResp = docData.respuesta_sunat || docData.sunat;

                if (docData.estado_sunat === 'RECHAZADO') {
                    updateData.estado = 'rechazado';
                    updateData.error_mensaje = sunatResp ? JSON.stringify(sunatResp) : 'RECHAZADO por SUNAT';
                } else if (docData.estado_sunat === 'ERROR') {
                    updateData.estado = 'error';
                    updateData.error_mensaje = sunatResp ? JSON.stringify(sunatResp) : 'ERROR tecnico';
                }

                await comp.update(updateData);
                actualizados++;
                console.log(`[SYNC] Comprobante #${comp.id} (sync:${comp.syncrofact_id}) -> ${docData.estado_sunat}`);
            } catch (err) {
                console.error(`[SYNC] Error con comprobante #${comp.id}:`, err.message);
            }
        }

        res.json({ ok: true, total: comprobantes.length, actualizados });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// Socket.io - Batch de emision
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('emitir-batch', async (ids) => {
        // Verificar SUNAT antes de empezar
        const sunatCheck = await verificarSunat();
        if (!sunatCheck.online) {
            socket.emit('batch-error', {
                message: 'SUNAT no esta disponible en este momento. Intente mas tarde.',
                detail: sunatCheck.error,
            });
            return;
        }
        console.log('[EMISION] SUNAT verificado OK, iniciando batch...');

        const total = ids.length;
        let procesados = 0;
        let exitosos = 0;
        let fallidos = 0;

        for (const id of ids) {
            try {
                const comprobante = await Comprobante.findByPk(id);

                if (!comprobante || ['emitido', 'rechazado'].includes(comprobante.estado)) {
                    procesados++;
                    socket.emit('batch-progreso', {
                        total, procesados, exitosos, fallidos,
                        actual: { id, status: 'skip', message: 'Ya emitido o no encontrado' },
                    });
                    continue;
                }

                const esBoleta = comprobante.tipo_comprobante === 'boleta';
                const serie = esBoleta ? SERIE_BOLETA : SERIE_FACTURA;
                const endpoint = esBoleta ? '/v1/boletas' : '/v1/invoices';

                const payload = {
                    company_id: COMPANY_ID,
                    branch_id: BRANCH_ID,
                    serie,
                    fecha_emision: comprobante.fecha_emision,
                    moneda: 'PEN',
                    forma_pago_tipo: 'Contado',
                    client: {
                        tipo_documento: comprobante.tipo_documento_cliente,
                        numero_documento: comprobante.numero_documento_cliente,
                        razon_social: comprobante.razon_social_cliente,
                        ...(comprobante.direccion_cliente && { direccion: comprobante.direccion_cliente }),
                    },
                    detalles: [{
                        codigo: comprobante.codigo_producto,
                        descripcion: comprobante.descripcion_producto,
                        unidad: 'KGM',
                        cantidad: comprobante.cantidad,
                        mto_precio_unitario: comprobante.precio_unitario,
                        tip_afe_igv: '10',
                        porcentaje_igv: 18,
                    }],
                };

                if (esBoleta) payload.metodo_envio = 'individual';

                console.log(`[EMISION] Comprobante #${id} - Enviando a ${endpoint}:`, JSON.stringify(payload, null, 2));

                const syncResponse = await fetch(`${SYNCROFACT_BASE_URL}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SYNCROFACT_TOKEN}`,
                    },
                    body: JSON.stringify(payload),
                });

                const data = await syncResponse.json();
                console.log(`[EMISION] Comprobante #${id} - Respuesta (HTTP ${syncResponse.status}):`, JSON.stringify(data, null, 2));

                if (syncResponse.ok && data.success) {
                    // Guardar datos iniciales (estado EN_COLA normalmente)
                    await comprobante.update({
                        estado: 'emitido',
                        syncrofact_id: data.data.id,
                        numero_completo: data.data.numero_completo,
                        serie: data.data.serie,
                        correlativo: data.data.correlativo,
                        estado_sunat: data.data.estado_sunat || 'EN_COLA',
                        consulta_url: data.data.consulta_url,
                        pdf_url: data.data.pdf_url,
                        error_mensaje: null,
                    });

                    // Polling para obtener estado final de SUNAT
                    socket.emit('batch-progreso', {
                        total, procesados, exitosos, fallidos,
                        actual: { id, status: 'polling', numero: data.data.numero_completo, message: `${data.data.numero_completo} - Esperando respuesta SUNAT...` },
                    });

                    const estadoFinal = await pollEstadoSunat(data.data.id, esBoleta);

                    if (estadoFinal) {
                        const sunatResp = estadoFinal.respuesta_sunat || estadoFinal.sunat;
                        await comprobante.update({
                            estado_sunat: estadoFinal.estado_sunat,
                            ...(estadoFinal.estado_sunat === 'RECHAZADO' ? {
                                estado: 'rechazado',
                                error_mensaje: sunatResp ? JSON.stringify(sunatResp) : `RECHAZADO por SUNAT`,
                            } : {}),
                            ...(estadoFinal.estado_sunat === 'ERROR' ? {
                                estado: 'error',
                                error_mensaje: sunatResp ? JSON.stringify(sunatResp) : `ERROR tecnico`,
                            } : {}),
                        });

                        if (estadoFinal.estado_sunat === 'ACEPTADO') {
                            procesados++;
                            exitosos++;
                            const desc = sunatResp?.descripcion || sunatResp?.description || '';
                            console.log(`[EMISION] Comprobante #${id} - ACEPTADO: ${data.data.numero_completo} ${desc}`);
                            socket.emit('batch-progreso', {
                                total, procesados, exitosos, fallidos,
                                actual: { id, status: 'ok', numero: data.data.numero_completo, estado_sunat: 'ACEPTADO' },
                            });
                        } else {
                            procesados++;
                            fallidos++;
                            const motivo = sunatResp?.descripcion || sunatResp?.description || estadoFinal.estado_sunat;
                            const codigo = sunatResp?.codigo || sunatResp?.code || '';
                            const errorDetail = codigo ? `[${codigo}] ${motivo}` : motivo;
                            console.error(`[EMISION] Comprobante #${id} - ${estadoFinal.estado_sunat}: ${errorDetail}`);
                            socket.emit('batch-progreso', {
                                total, procesados, exitosos, fallidos,
                                actual: { id, status: 'error', numero: data.data.numero_completo, estado_sunat: estadoFinal.estado_sunat, message: errorDetail, response: sunatResp },
                            });
                        }
                    } else {
                        // Timeout de polling - quedo en estado intermedio
                        procesados++;
                        exitosos++;
                        console.log(`[EMISION] Comprobante #${id} - Enviado OK, estado SUNAT pendiente de confirmar`);
                        socket.emit('batch-progreso', {
                            total, procesados, exitosos, fallidos,
                            actual: { id, status: 'ok', numero: data.data.numero_completo, estado_sunat: comprobante.estado_sunat, message: 'Enviado, esperando confirmacion SUNAT' },
                        });
                    }
                } else {
                    // Error de validacion de Syncrofact (no llego a SUNAT)
                    const sunatCode = data.code || syncResponse.status;
                    const sunatMsg = data.message || 'Error en Syncrofact';
                    const errorDetail = `[${sunatCode}] ${sunatMsg}`;

                    console.error(`[EMISION] Comprobante #${id} - ERROR: ${errorDetail}`);
                    console.error(`[EMISION] Comprobante #${id} - Respuesta completa:`, JSON.stringify(data));

                    await comprobante.update({
                        estado: 'error',
                        error_mensaje: JSON.stringify(data),
                    });
                    procesados++;
                    fallidos++;
                    socket.emit('batch-progreso', {
                        total, procesados, exitosos, fallidos,
                        actual: { id, status: 'error', message: errorDetail, sunat_code: sunatCode, response: data },
                    });
                }
            } catch (err) {
                console.error(`[EMISION] Comprobante #${id} - EXCEPCION:`, err.message);
                procesados++;
                fallidos++;
                socket.emit('batch-progreso', {
                    total, procesados, exitosos, fallidos,
                    actual: { id, status: 'error', message: `Excepcion: ${err.message}` },
                });
            }
        }

        socket.emit('batch-completado', { total, exitosos, fallidos });
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

sequelize.sync().then(() => {
    server.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}).catch((err) => {
    console.error('Error al conectar a la base de datos:', err);
});
