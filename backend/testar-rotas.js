// backend/testar-rotas.js
const http = require('http');

const testarRota = (metodo, caminho, dados = null) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: caminho,
            method: metodo,
            headers: {}
        };

        if (dados) {
            options.headers['Content-Type'] = 'application/json';
        }

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log(`✅ ${metodo} ${caminho}: ${res.statusCode}`);
                if (responseData) {
                    try {
                        console.log('   Resposta:', JSON.parse(responseData));
                    } catch {
                        console.log('   Resposta:', responseData);
                    }
                }
                resolve({ status: res.statusCode, data: responseData });
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${metodo} ${caminho}: Erro - ${error.message}`);
            resolve({ status: 500, error: error.message });
        });

        if (dados) {
            req.write(JSON.stringify(dados));
        }
        req.end();
    });
};

async function testarTodasRotas() {
    console.log('🚀 TESTANDO ROTAS DE PEDIDOS\n');
    
    // Teste básico
    await testarRota('GET', '/api/debug');
    
    // Teste de rota de status (deve retornar 404 ou 400 - mas não 404 de rota)
    await testarRota('PUT', '/api/pedidos/dlcrepes/1/status', { status: 'pronto' });
    
    // Teste de listagem
    await testarRota('GET', '/api/pedidos/dlcrepes');
    
    // Teste de dashboard
    await testarRota('GET', '/api/dashboard/dlcrepes');
    
    console.log('\n✅ Testes concluídos');
}

testarTodasRotas();