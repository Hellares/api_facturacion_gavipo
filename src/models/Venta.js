import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Venta = sequelize.define(
    'Venta',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        created_by: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        orden_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        orden_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        zona_code: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        pesador_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        pesador_nombre: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        cliente_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        cliente_nombre: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        cliente_celular: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        cliente_estado_cta: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        camal_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        camal_nombre: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        producto_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        producto_nombre: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        precio: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        pesajes: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        total_jabas: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        total_bruto: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        total_tara: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        total_neto: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        total_aves: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        total_promedio: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        total_importe: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        anulada: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        observacion: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
    },
    {
        tableName: 'ventas',
        timestamps: false,
    }
);