// backend/testar-rotas-completo.js
const http = require('http');

const BASE_URL = 'http://localhost:3000';

const rotasParaTestar = [
    { metodo: 'GET', caminho: '/api/debug', desc: 'Debug geral' },
    { metodo: 'GET', caminho: '/api/pedidos/dlcrepes', desc: 'Listar pedidos' },
    { metodo: 'GET', caminho: '/api/pedidos/dlcrepes/1', desc: 'Buscar pedido (deve falhar - sem ID 1)' },
    { metodo: 'PUT', caminho: '/api/pedidos/dlcrepes/1/status', body: { status: 'pronto' }, desc: 'Atualizar status' },
    { metodo: 'DELETE', caminho: '/api/pedidos/dlcrepes/1', desc: 'Excluir pedido (deve falhar - sem ID 1)' },
    { metodo: 'POST', caminho: '/api/pedidos/dlcrepes', body: { 
        cliente_nome: 'Teste',
        cliente_telefone: '51999999999',
        itens: [{ produto_nome: 'Teste', preco_unitario: 10, quantidade: 1 }],
        subtotal: 10,
        total: 10
    }, desc: 'Criar pedido' }
];

async function testarRota(rota) {
    return new Promise((resolve) => {
        const url = new URL(rota.caminho, BASE_URL);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: url.pathname,
            method: rota.metodo,
            headers: {}
        };

        if (rota.body) {
            options.headers['Content-Type'] = 'application/json';
        }

        console.log(`\n🔍 Testando: ${rota.desc}`);
        console.log(`   ${rota.metodo} ${rota.caminho}`);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const statusOK = res.statusCode >= 200 && res.statusCode < 300;
                const emoji = statusOK ? '✅' : '❌';
                console.log(`   ${emoji} Status: ${res.statusCode} ${res.statusMessage}`);
                
                if (data) {
                    try {
                        const json = JSON.parse(data);
                        if (json.erro) {
                            console.log(`      Erro: ${json.erro}`);
                        }
                    } catch {
                        // Não é JSON, ignorar
                    }
                }
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', (error) => {
            console.log(`   ❌ Erro de conexão: ${error.message}`);
            resolve({ status: 500, error: error.message });
        });

        if (rota.body) {
            req.write(JSON.stringify(rota.body));
        }
        req.end();
    });
}

async function testarTudo() {
    console.log('🚀 INICIANDO TESTE COMPLETO DE ROTAS\n');
    console.log('=' .repeat(60));
    
    for (const rota of rotasParaTestar) {
        await testarRota(rota);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Testes concluídos');
}

testarTudo();