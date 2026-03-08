// backend/src/controllers/uploadController.js
const fs = require('fs');
const path = require('path');

const uploadController = {
    // ===== UPLOAD DE IMAGEM =====
    async uploadImagem(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
            }

            // Gerar URL pública para a imagem
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
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
    },

    // ===== EXCLUIR IMAGEM =====
    async excluirImagem(req, res) {
        try {
            const { filename } = req.params;
            const filePath = path.join(__dirname, '../../uploads', filename);

            // Verificar se arquivo existe
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ erro: 'Arquivo não encontrado' });
            }

            // Remover arquivo
            fs.unlinkSync(filePath);
            console.log('✅ Imagem excluída:', filename);

            res.json({
                sucesso: true,
                mensagem: 'Imagem excluída com sucesso'
            });
        } catch (error) {
            console.error('❌ Erro ao excluir imagem:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = uploadController;