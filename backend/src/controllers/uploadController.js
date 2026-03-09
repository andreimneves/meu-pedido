const fs = require('fs');
const path = require('path');

const uploadController = {
    // Upload de imagem
    uploadImagem: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
            }

            const baseUrl = process.env.BASE_URL || 'https://meu-pedido-backend.onrender.com';
            const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

            console.log('✅ Imagem enviada:', fileUrl);

            res.json({
                sucesso: true,
                mensagem: 'Imagem enviada com sucesso',
                arquivo: {
                    nome: req.file.filename,
                    url: fileUrl,
                    tamanho: req.file.size,
                    tipo: req.file.mimetype
                }
            });
        } catch (error) {
            console.error('❌ Erro no upload:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = uploadController;