const router = require('express').Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const { create, getByEmail } = require('../../models/usuario');

router.post('/registro', [
    check('username')
        .exists().withMessage('El campo username es obligatorio.')
        .notEmpty().withMessage('El campo username no puede estar vacío.'),
    check('email')
        .exists().withMessage('El campo email es obligatorio.')
        .notEmpty().withMessage('El campo email no puede estar vacío.')
        .isEmail().withMessage('El campo email debe tener una estructura correcta.')
        .custom(email => {
            // Al aplicarle una promesa, el resolve y el reject ejercen como true o false.
            return new Promise((resolve, reject) => {
                db.query('SELECT * FROM usuarios WHERE email = ?', [email], function (err, results) {
                    if (err)
                        reject(err);
                    if (results.length > 0)
                        reject(new Error('El email introducido ya existe, por favor, elige otro email.'));
                    resolve();
                });
            })
        }),
    check('password')
        .exists().withMessage('El campo password es obligatorio.')
        .notEmpty().withMessage('El campo password no puede estar vacío.')
        .isLength({ min: 5 }).withMessage('La password debe tener una longitud mínima de 5 caracteres.')
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json(errors.array());
    } else {
        req.body.password = bcrypt.hashSync(req.body.password, 10);
        try {
            await create(req.body);
            res.json({ SUCCESS: 'Usuario creado correctamente' });
        } catch (err) {
            res.status(500).json({ msg: err.message });
        }
    };
});


router.post('/login', [
    check('email')
        .exists().withMessage('El campo email es obligatorio.')
        .notEmpty().withMessage('El campo email no puede estar vacío.'),
    check('password')
        .exists().withMessage('El campo password es obligatorio.')
        .notEmpty().withMessage('El campo password no puede estar vacío.')
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return res.json(errors.array());
    }

    const usuario = await getByEmail(req.body.email);
    if (usuario) {
        const iguales = bcrypt.compareSync(req.body.password, usuario.password)
        if (iguales) {
            res.json({ SUCCESS: 'El login ha sido correcto.', id_usuario: usuario.id_usuario, token: createToken(usuario) });
        } else {
            res.json([{ msg: 'El email/password son incorrectos.' }]);
        }
    } else {
        res.json([{ msg: 'El email/password son incorrectos.' }]);
    }
});


router.get('/', async (req, res) => {
    try {
        const row = await getByEmail(req.body.email);
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ ERROR: 'No existe ese email en la BBDD' });
        }

    } catch (err) {
        res.status(500).json({ ERROR: err.message });
    }
});


/*
*HELPERS
*/

const createToken = (pUser) => {
    const payload = {
        userId: pUser.id_usuario,
        username: pUser.username,
        createdAt: moment().unix(),
        expiredAt: moment().add(10, 'days').unix()
    }
    return jwt.sign(payload, process.env.SECRET_KEY);
};

module.exports = router;