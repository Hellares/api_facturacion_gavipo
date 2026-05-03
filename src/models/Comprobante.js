import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Comprobante = sequelize.define(
    'Comprobante',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        venta_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        tipo_comprobante: {
            type: DataTypes.STRING(10),
            allowNull: false,
            validate: {
                isIn: [['factura', 'boleta']],
            },
        },
        fecha_emision: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        // Datos del cliente para el comprobante
        tipo_documento_cliente: {
            type: DataTypes.STRING(2),
            allowNull: false,
            comment: '6=RUC, 1=DNI, 4=CE, 0=Otros',
        },
        numero_documento_cliente: {
            type: DataTypes.STRING(15),
            allowNull: false,
        },
        razon_social_cliente: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        direccion_cliente: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        // Detalle del producto
        codigo_producto: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        descripcion_producto: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        cantidad: {
            type: DataTypes.FLOAT,
            allowNull: false,
            comment: 'Cantidad en KGM',
        },
        precio_unitario: {
            type: DataTypes.FLOAT,
            allowNull: false,
            comment: 'Precio unitario con IGV',
        },
        importe: {
            type: DataTypes.FLOAT,
            allowNull: false,
            comment: 'Importe parcial de este comprobante',
        },
        // Estado del comprobante
        estado: {
            type: DataTypes.STRING(15),
            allowNull: false,
            defaultValue: 'pendiente',
            validate: {
                isIn: [['pendiente', 'emitido', 'error', 'rechazado']],
            },
        },
        // Datos de respuesta de Syncrofact
        syncrofact_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        numero_completo: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Ej: F001-000003 o B001-000015',
        },
        serie: {
            type: DataTypes.STRING(4),
            allowNull: true,
        },
        correlativo: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        estado_sunat: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        consulta_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        pdf_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        error_mensaje: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        observacion: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
    },
    {
        tableName: 'comprobantes_beta',
    }
);
