import { response, json } from 'express';
import bcrypt from 'bcryptjs';
import { sequelize, User } from '../models/index.js';
import { generarJWT } from '../helpers/jwt.js';

export const login = async (req, res = response) => {
    const { email, password, app_type, version } = req.body;

    try {
        // const [appQuery] = await sequelize.query(
        //     'SELECT * FROM app_version WHERE nombre = ? AND version = ?',
        //     { replacements: [app_type, version] }
        // );
        // if(!appQuery[0]){
        //     return res.status(404).json({
        //         ok: false,
        //         message: 'Actualice su aplicación a la última versión'
        //     });
        // }

        const usuarioDB = await User.scope('withPassword').findOne({ where: { email } });
        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                message: 'Email no encontrado'
            });
        }

        if (usuarioDB.active === 1) {
            return res.status(401).json({
                ok: false,
                message: 'El usuario ya tiene una sesion iniciada'
            });
        }

        const validPassword = bcrypt.compareSync(password, usuarioDB.password);
        if (!validPassword) {
            return res.status(401).json({
                ok: false,
                message: 'Password no valido'
            });
        }

        const token = await generarJWT({ email, password: usuarioDB.password });

        const user = await User.scope('withPassword').findOne({ where: { email } });

        res.json({
            ok: true,
            user,
            token
        });
    } catch (error) {
        const { message } = error;
        return res.status(500).json({
            ok: false,
            message
        });
    }
};