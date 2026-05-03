import jwt from 'jsonwebtoken';

export const generarJWT = (object) => {
    return new Promise((resolve, reject) => {
        const payload =  object ;

        jwt.sign(payload, process.env.JWT_KEY, {
            expiresIn: "24h"
        }, (err, token) => {
            if (err) {
                reject('Error al generar token');
            } else {
                resolve(token);
            }
        });
    });
}


export const comprobarJWT = (token = '') => {
    try {
        const { uid } = jwt.verify(token, process.env.JWT_KEY);
        return [true, uid];
    } catch (error) {
        return [false, null];
    }
};