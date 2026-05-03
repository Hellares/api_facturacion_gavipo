import { Router } from 'express';
import { check } from 'express-validator';
import { validarJWT } from '../middlewares/validar_jwt.js';
import {
    crearComprobante,
    obtenerComprobantesPorVenta,
    obtenerComprobante,
    consultarComprobanteSyncrofact,
    listarEmitidos,
    listarComprobantes,
    editarComprobante,
    eliminarComprobante,
} from '../controllers/comprobantes.js';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(validarJWT);

// Crear registro previo de comprobante
router.post('/', [
    check('venta_id', 'El venta_id es obligatorio').not().isEmpty(),
    check('venta_id', 'El venta_id debe ser numerico').isNumeric(),
    check('tipo_comprobante', 'El tipo_comprobante es obligatorio').not().isEmpty(),
    check('tipo_comprobante', 'El tipo debe ser factura o boleta').isIn(['factura', 'boleta']),
    check('fecha_emision', 'La fecha_emision es obligatoria').not().isEmpty(),
    check('fecha_emision', 'La fecha_emision debe ser formato YYYY-MM-DD').isDate(),
    check('tipo_documento_cliente', 'El tipo_documento_cliente es obligatorio').not().isEmpty(),
    check('numero_documento_cliente', 'El numero_documento_cliente es obligatorio').not().isEmpty(),
    check('razon_social_cliente', 'La razon_social_cliente es obligatoria').not().isEmpty(),
    check('codigo_producto', 'El codigo_producto es obligatorio').not().isEmpty(),
    check('descripcion_producto', 'La descripcion_producto es obligatoria').not().isEmpty(),
    check('cantidad', 'La cantidad es obligatoria').not().isEmpty(),
    check('cantidad', 'La cantidad debe ser numerica').isNumeric(),
    check('precio_unitario', 'El precio_unitario es obligatorio').not().isEmpty(),
    check('precio_unitario', 'El precio_unitario debe ser numerico').isNumeric(),
], crearComprobante);

// Listar todos los comprobantes con filtros
router.get('/todos', listarComprobantes);

// Listar comprobantes emitidos (query param ?tipo=factura|boleta)
router.get('/emitidos', listarEmitidos);

// Obtener comprobantes de una venta
router.get('/venta/:venta_id', obtenerComprobantesPorVenta);

// Obtener un comprobante por ID
router.get('/:id', obtenerComprobante);

// Consultar estado en Syncrofact
router.get('/:id/consultar', consultarComprobanteSyncrofact);

// Editar comprobante pendiente o en error
router.put('/:id', editarComprobante);

// Eliminar comprobante pendiente
router.delete('/:id', eliminarComprobante);

export default router;
