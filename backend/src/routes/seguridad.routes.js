const express = require('express');
const { body } = require('express-validator');
const seguridadController = require('../controllers/seguridad.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(verifyToken);
router.use(requireAdmin);

router.get('/backups', seguridadController.listBackups);
router.post('/backups', seguridadController.createBackup);
router.get('/backups/:file', seguridadController.downloadBackup);
router.post(
  '/restore',
  [
    body('file').trim().notEmpty().withMessage('Debe seleccionar un archivo de backup.'),
    validate
  ],
  seguridadController.restoreBackup
);

module.exports = router;
