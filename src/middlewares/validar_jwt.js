import jwt from 'jsonwebtoken';

export const validarJWT = (req, res, next) => {
    const token = req.header('x-token');

    if(!token){
        return res.status(404).json({
            ok: false,
            message: 'No hay token en la petición'
        });
    }

    try { 
        const uid = jwt.verify(token, process.env.JWT_KEY);
        req.uid = uid;
        next();
    } catch (error) {
        return res.status(401).json({
            ok: false,
            message: 'Token no valido'
        });
    }

};