import { response } from 'express';
import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Comprobante, Venta } from '../models/index.js';

// Crear registro previo de comprobante
export const crearComprobante = async (req, res = response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const {
        venta_id,
        tipo_comprobante,
        fecha_emision,
        tipo_documento_cliente,
        numero_documento_cliente,
        razon_social_cliente,
        direccion_cliente,
        codigo_producto,
        descripcion_producto,
        cantidad,
        precio_unitario,
        observacion,
    } = req.body;

    try {
        const venta = await Venta.findByPk(venta_id);
        if (!venta) {
            return res.status(404).json({ ok: false, message: 'Venta no encontrada' });
        }

        // Calcular importe
        const importe = parseFloat((cantidad * precio_unitario).toFixed(2));

        // Validar que la suma de comprobantes no exceda el total de la venta
        const comprobantesExistentes = await Comprobante.findAll({
            where: { venta_id, estado: ['pendiente', 'emitido', 'rechazado'] },
        });

        const totalComprobantes = comprobantesExistentes.reduce(
            (sum, c) => sum + c.importe, 0
        );

        if (parseFloat((totalComprobantes + importe).toFixed(2)) > venta.total_importe) {
            return res.status(400).json({
                ok: false,
                message: `El importe total de comprobantes (${(totalComprobantes + importe).toFixed(2)}) excede el total de la venta (${venta.total_importe})`,
            });
        }

        const comprobante = await Comprobante.create({
            venta_id,
            tipo_comprobante,
            fecha_emision,
            tipo_documento_cliente,
            numero_documento_cliente,
            razon_social_cliente,
            direccion_cliente,
            codigo_producto,
            descripcion_producto,
            cantidad,
            precio_unitario,
            importe,
            observacion,
        });

        res.status(201).json({ ok: true, comprobante });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

// Listar comprobantes por venta
export const obtenerComprobantesPorVenta = async (req, res = response) => {
    const { venta_id } = req.params;

    try {
        const comprobantes = await Comprobante.findAll({
            where: { venta_id },
            include: [{ model: Venta, as: 'venta' }],
            order: [['id', 'ASC']],
        });

        res.json({ ok: true, comprobantes });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

// Obtener un comprobante por ID
export const obtenerComprobante = async (req, res = response) => {
    const { id } = req.params;

    try {
        const comprobante = await Comprobante.findByPk(id, {
            include: [{ model: Venta, as: 'venta' }],
        });

        if (!comprobante) {
            return res.status(404).json({ ok: false, message: 'Comprobante no encontrado' });
        }

        res.json({ ok: true, comprobante });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

// Consultar estado de un comprobante emitido en Syncrofact
export const consultarComprobanteSyncrofact = async (req, res = response) => {
    const { id } = req.params;
    const BASE_URL = 'https://beta.syncrofact.net.pe/api';
    const TOKEN = process.env.SYNCROFACT_TOKEN || '';

    try {
        const comprobante = await Comprobante.findByPk(id);

        if (!comprobante) {
            return res.status(404).json({ ok: false, message: 'Comprobante no encontrado' });
        }

        if (comprobante.estado !== 'emitido' || !comprobante.syncrofact_id) {
            return res.status(400).json({ ok: false, message: 'El comprobante no ha sido emitido aun' });
        }

        const esBoleta = comprobante.tipo_comprobante === 'boleta';
        const endpoint = esBoleta
            ? `/v1/boletas/${comprobante.syncrofact_id}`
            : `/v1/invoices/${comprobante.syncrofact_id}`;

        const syncResponse = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` },
        });

        const data = await syncResponse.json();

        if (data.data?.estado_sunat) {
            await comprobante.update({ estado_sunat: data.data.estado_sunat });
        }

        res.json({ ok: true, data });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

// Listar comprobantes emitidos (facturas o boletas)
export const listarEmitidos = async (req, res = response) => {
    const { tipo } = req.query; // 'factura' o 'boleta'

    try {
        const where = { estado: 'emitido' };
        if (tipo) where.tipo_comprobante = tipo;

        const comprobantes = await Comprobante.findAll({
            where,
            include: [{ model: Venta, as: 'venta' }],
            order: [['id', 'DESC']],
        });

        res.json({ ok: true, comprobantes });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

// Listar todos los comprobantes con filtros
export const listarComprobantes = async (req, res = response) => {
    const { fecha, estado, cliente } = req.query;

    try {
        const where = {};
        if (fecha) where.fecha_emision = fecha;
        if (estado) where.estado = estado;

        const include = [{
            model: Venta,
            as: 'venta',
            attributes: ['id', 'cliente_nombre', 'producto_nombre', 'orden_date'],
            ...(cliente ? { where: { cliente_nombre: { [Op.like]: `%${cliente}%` } } } : {}),
        }];

        const comprobantes = await Comprobante.findAll({
            where,
            include,
            order: [['id', 'DESC']],
        });

        res.json({ ok: true, comprobantes });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

// Editar comprobante pendiente o en error
export const editarComprobante = async (req, res = response) => {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, errors: errors.array() });
    }

    try {
        const comprobante = await Comprobante.findByPk(id);

        if (!comprobante) {
            return res.status(404).json({ ok: false, message: 'Comprobante no encontrado' });
        }

        if (comprobante.estado === 'emitido') {
            return res.status(400).json({ ok: false, message: 'No se puede editar un comprobante ya emitido' });
        }

        const {
            tipo_comprobante,
            fecha_emision,
            tipo_documento_cliente,
            numero_documento_cliente,
            razon_social_cliente,
            direccion_cliente,
            codigo_producto,
            descripcion_producto,
            cantidad,
            precio_unitario,
            observacion,
        } = req.body;

        const importe = parseFloat((cantidad * precio_unitario).toFixed(2));

        // Validar que la suma no exceda el total de la venta
        const venta = await Venta.findByPk(comprobante.venta_id);
        const comprobantesExistentes = await Comprobante.findAll({
            where: {
                venta_id: comprobante.venta_id,
                estado: ['pendiente', 'emitido'],
                id: { [Op.ne]: id },
            },
        });

        const totalOtros = comprobantesExistentes.reduce((sum, c) => sum + c.importe, 0);

        if (parseFloat((totalOtros + importe).toFixed(2)) > venta.total_importe) {
            return res.status(400).json({
                ok: false,
                message: `El importe total de comprobantes (${(totalOtros + importe).toFixed(2)}) excede el total de la venta (${venta.total_importe})`,
            });
        }

        await comprobante.update({
            tipo_comprobante,
            fecha_emision,
            tipo_documento_cliente,
            numero_documento_cliente,
            razon_social_cliente,
            direccion_cliente,
            codigo_producto,
            descripcion_producto,
            cantidad,
            precio_unitario,
            importe,
            observacion,
            // Si estaba en error, volver a pendiente
            ...(comprobante.estado === 'error' ? { estado: 'pendiente', error_mensaje: null } : {}),
        });

        res.json({ ok: true, comprobante });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

// Eliminar comprobante pendiente
export const eliminarComprobante = async (req, res = response) => {
    const { id } = req.params;

    try {
        const comprobante = await Comprobante.findByPk(id);

        if (!comprobante) {
            return res.status(404).json({ ok: false, message: 'Comprobante no encontrado' });
        }

        if (comprobante.estado === 'emitido') {
            return res.status(400).json({ ok: false, message: 'No se puede eliminar un comprobante ya emitido' });
        }

        await comprobante.destroy();

        res.json({ ok: true, message: 'Comprobante eliminado' });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};
