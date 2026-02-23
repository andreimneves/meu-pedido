// backend/src/controllers/lojaController.js
const pool = require('../config/database');

const lojaController = {
    async verificarStatusLoja(req, res) {
        try {
            const { subdominio } = req.params;
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar configurações da loja
            const configQuery = await pool.query(
                'SELECT horario_funcionamento FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            const agora = new Date();
            const diaSemana = agora.getDay();
            const horaAtual = agora.getHours() * 60 + agora.getMinutes(); // minutos desde meia-noite
            
            // Buscar horário da loja (precisa criar tabela horarios_loja)
            // Por enquanto, retorna simulado
            const lojaAberta = true; // Simulado
            
            res.json({
                loja_aberta: lojaAberta,
                mensagem: lojaAberta ? 'Loja aberta' : 'Loja fechada',
                pode_agendar: true,
                delivery_disponivel: lojaAberta
            });
            
        } catch (error) {
            console.error('Erro ao verificar status da loja:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = lojaController;