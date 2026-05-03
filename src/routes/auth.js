import { Router } from 'express';
import { check } from 'express-validator';
import { login } from '../controllers/auth.js';

const router = Router();

router.post('/signin',[
    check('email', 'El email es obligatorio').not().isEmpty(),
    check('email', 'El email no es válido').isEmail(),
    check('password', 'El password es obligatorio').not().isEmpty()
], login);

export default router;