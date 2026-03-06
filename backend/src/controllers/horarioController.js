const pool = require('../config/database');

// O "Robô Construtor": Cria e preenche a tabela sozinho se ela não existir
let dbInitHorarios = null;

function garantirTabelaHorarios() {
    if (!dbInitHorarios) {
        dbInitHorarios = (async () => {
            try {
                // 1. Cria a tabela automaticamente
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
                        id SERIAL PRIMARY KEY,
                        tenant_id INTEGER DEFAULT 1,
                        tipo VARCHAR(20) NOT NULL,
                        dia_semana INTEGER NOT NULL,
                        aberto BOOLEAN DEFAULT true,
                        abertura TIME NOT NULL DEFAULT '18:00',
                        fechamento TIME NOT NULL DEFAULT '23:00'
                    );
                `);

                // 2. Verifica se a tabela está vazia
                const check = await pool.query('SELECT COUNT(*) FROM horarios_funcionamento');
                
                // 3. Se estiver vazia, injeta os 14 dias (7 para loja, 7 para delivery)
                if (parseInt(check.rows[0].count) === 0) {
                    await pool.query(`
                        INSERT INTO horarios_funcionamento (tipo, dia_semana, aberto, abertura, fechamento) VALUES 
                        ('loja', 0, true, '18:00', '23:00'), ('loja', 1, true, '18:00', '23:00'),
                        ('loja', 2, true, '18:00', '23:00'), ('loja', 3, true, '18:00', '23:00'),
                        ('loja', 4, true, '18:00', '23:00'), ('loja', 5, true, '18:00', '23:30'),
                        ('loja', 6, true, '18:00', '23:30'),
                        ('delivery', 0, true, '18:00', '23:00'), ('delivery', 1, true, '18:00', '23:00'),
                        ('delivery', 2, true, '18:00', '23:00'), ('delivery', 3, true, '18:00', '23:00'),
                        ('delivery', 4, true, '18:00', '23:00'), ('delivery', 5, true, '18:00', '23:30'),
                        ('delivery', 6, true, '18:00', '23:30');
                    `);
                    console.log("Tabela de horários criada e preenchida com sucesso!");
                }
            } catch (e) {
                console.log("Erro na auto-criação de horários:", e.message);
                dbInitHorarios = null; 
            }
        })();
    }
    return dbInitHorarios;
}

const horarioController = {
    async listar(req, res) {
        try {
            await garantirTabelaHorarios(); // Garante que a tabela existe antes de ler
            const result = await pool.query('SELECT * FROM horarios_funcionamento ORDER BY tipo DESC, dia_semana');
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async atualizar(req, res) {
        const { horarios } = req.body;
        try {
            await garantirTabelaHorarios();
            await pool.query('BEGIN');
            for (let h of horarios) {
                await pool.query(
                    'UPDATE horarios_funcionamento SET aberto=$1, abertura=$2, fechamento=$3 WHERE id=$4',
                    [h.aberto, h.abertura, h.fechamento, h.id]
                );
            }
            await pool.query('COMMIT');
            res.json({ mensagem: "Horários atualizados com sucesso!" });
        } catch (error) {
            await pool.query('ROLLBACK');
            res.status(500).json({ erro: error.message });
        }
    },

    async verificarStatus(req, res) {
        try {
            await garantirTabelaHorarios();
            
            // O app envia ?tipo=loja ou ?tipo=delivery
            const tipo = req.query.tipo || 'loja'; 
            
            // Pega a hora atual e converte para o horário de Brasília
            const agora = new Date();
            const agoraBrasil = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const diaSemana = agoraBrasil.getDay();
            const horaAtual = agoraBrasil.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

            const result = await pool.query(
                `SELECT * FROM horarios_funcionamento 
                 WHERE tipo = $1 AND dia_semana = $2 AND aberto = true 
                 AND $3 BETWEEN abertura AND fechamento`,
                [tipo, diaSemana, horaAtual]
            );

            res.json({ aberto: result.rows.length > 0 });
        } catch (error) { 
            console.error("Erro ao verificar status:", error.message);
            res.json({ aberto: false }); 
        }
    }
};

module.exports = horarioController;