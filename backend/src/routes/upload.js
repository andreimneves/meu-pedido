// backend/src/routes/upload.js
const express = require('express');
const upload = require('../config/upload');
const uploadController = require('../controllers/uploadController');
const router = express.Router();

// POST /api/upload - Fazer upload de imagem
router.post('/upload', upload.single('imagem'), uploadController.uploadImagem);

// DELETE /api/upload/:filename - Excluir imagem
router.delete('/upload/:filename', uploadController.excluirImagem);

module.exports = router;