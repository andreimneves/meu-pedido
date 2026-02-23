// backend/src/controllers/lojaController.js
const pool = require('../config/database');

const lojaController = {
    async verificarStatusLoja(req, res) {
        try {
            const { subdominio } = req.params;
            
            // Versão simplificada - retorna sempre aberto por enquanto
            res.json({
                loja_aberta: true,
                mensagem: 'Loja aberta',
                pode_agendar: true,
                delivery_disponivel: true
            });
            
        } catch (error) {
            console.error('Erro ao verificar status da loja:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = lojaController;