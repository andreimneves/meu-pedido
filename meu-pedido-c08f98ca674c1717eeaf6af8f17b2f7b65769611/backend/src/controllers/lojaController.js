// backend/src/controllers/lojaController.js
const pool = require('../config/database');

const lojaController = {
    // Verificar status da loja (aberta/fechada)
    async verificarStatusLoja(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log('🔍 Verificando status da loja para:', subdominio);
            
            // Buscar tenant pelo subdomínio
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar horários de funcionamento da loja
            // Por enquanto, vamos buscar da tabela de configurações
            const configQuery = await pool.query(
                'SELECT horario_funcionamento FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            const agora = new Date();
            const diaSemana = agora.getDay(); // 0=domingo, 1=segunda...
            const horaAtual = agora.getHours() * 60 + agora.getMinutes(); // minutos desde meia-noite
            
            // Simulação de horário (implementar depois com tabela específica)
            // Por enquanto, considera sempre aberto
            const lojaAberta = true;
            const mensagem = lojaAberta ? 'Loja aberta' : 'Loja fechada';
            
            res.json({
                loja_aberta: lojaAberta,
                mensagem: mensagem,
                pode_agendar: true, // Sempre pode agendar
                delivery_disponivel: lojaAberta,
                horario_funcionamento: configQuery.rows[0]?.horario_funcionamento || '18h às 23h'
            });
            
        } catch (error) {
            console.error('❌ Erro ao verificar status da loja:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar horários de funcionamento
    async buscarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar da tabela de horários (se existir)
            // Por enquanto, retorna valores padrão
            const horarios = [
                { dia: 0, nome: 'Domingo', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia: 1, nome: 'Segunda', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia: 2, nome: 'Terça', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia: 3, nome: 'Quarta', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia: 4, nome: 'Quinta', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia: 5, nome: 'Sexta', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia: 6, nome: 'Sábado', aberto: true, abertura: '18:00', fechamento: '23:00' }
            ];
            
            res.json(horarios);
            
        } catch (error) {
            console.error('❌ Erro ao buscar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar horários de funcionamento
    async atualizarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            const { horarios } = req.body;
            
            console.log('📝 Atualizando horários para:', subdominio);
            
            // Aqui você implementaria a lógica para salvar no banco
            // Por enquanto, apenas simula sucesso
            
            res.json({ 
                mensagem: 'Horários atualizados com sucesso',
                horarios: horarios 
            });
            
        } catch (error) {
            console.error('❌ Erro ao atualizar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Verificar se pode fazer pedido agora
    async verificarDisponibilidade(req, res) {
        try {
            const { subdominio } = req.params;
            
            const agora = new Date();
            const horaAtual = agora.getHours() * 60 + agora.getMinutes();
            const diaSemana = agora.getDay();
            
            // Simulação - considerar sempre disponível
            // Em produção, buscar da tabela de horários
            
            res.json({
                disponivel: true,
                mensagem: 'Delivery disponível',
                pode_agendar: true,
                proximo_horario: '18:00'
            });
            
        } catch (error) {
            console.error('❌ Erro ao verificar disponibilidade:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = lojaController;