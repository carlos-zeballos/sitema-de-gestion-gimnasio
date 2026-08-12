const express = require('express');
const membresiasController = require('../controllers/membresias.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @route GET /api/membresias/activas
 * @desc Obtener lista de clientes con membresía vigente
 * @access Autenticado (Ambos roles)
 */
router.get('/activas', membresiasController.getActivas);

/**
 * @route GET /api/membresias/vencidas
 * @desc Obtener lista de clientes con membresía vencida
 * @access Autenticado (Ambos roles)
 */
router.get('/vencidas', membresiasController.getVencidas);

/**
 * @route GET /api/membresias/pronto-vencer
 * @desc Obtener lista de clientes cuyas membresías vencen en los próximos 7 días
 * @access Autenticado (Ambos roles)
 */
router.get('/pronto-vencer', membresiasController.getProximasVencer);

module.exports = router;
