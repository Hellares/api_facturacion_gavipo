import { sequelize } from '../sequelize.js';
import { User } from './User.js';
import { Venta } from './Venta.js';
import { Comprobante } from './Comprobante.js';

// Asociaciones
Venta.hasMany(Comprobante, { foreignKey: 'venta_id', as: 'comprobantes' });
Comprobante.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });

export const models = {
    Venta,
    Comprobante,
};

export {
    sequelize,
    User,
    Venta,
    Comprobante,
};