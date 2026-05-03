import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombre: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        password: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        role: {
            type: DataTypes.STRING(5),
            validate: { isIn: [['ADM', 'CLI', 'PES']] },
        },
    },
    {
        tableName: 'users',
        timestamps: false,
        indexes: [{ unique: true, fields: ['email'] }],
        defaultScope: { attributes: { exclude: ['password'] } },
        scopes: { withPassword: { attributes: { include: ['password'] } } },

    }
);