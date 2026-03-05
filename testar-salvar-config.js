const fetch = require('node-fetch');

const API_URL = 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

async function testarSalvar() {
    console.log('📝 Testando salvamento de configurações...');
    
    // Dados de teste
    const dadosConfig = {
        nome_loja: 'DL Crepes e Lanches TESTE',
        slogan: 'O melhor da região',
        whatsapp: '11987654321',
        endereco_completo: 'Rua Teste, 123',
        cep_loja: '12345-678',
        cor_principal: '#FF0000',
        logo_url: 'https://exemplo.com/logo.jpg',
        taxa_minima: 5.00,
        taxa_por_km: 2.50,
        km_maximo_entrega: 20,
        frete_gratis_ativo: true,
        frete_gratis_acima: 50.00,
        horario_funcionamento: 'Seg a Sex: 18h às 23h',
        mensagem_banner_ativo: true,
        mensagem_banner: 'Promoção especial!',
        mensagem_banner_cor: '#FF0000',
        mensagem_banner_texto: '#FFFFFF',
        mensagem_banner_icone: '🔥'
    };

    try {
        // Testar GET antes
        console.log('\n📥 Buscando configurações atuais...');
        const getAntes = await fetch(`${API_URL}/config/${SUBDOMINIO}`);
        const dadosAntes = await getAntes.json();
        console.log('Configurações atuais:', dadosAntes);

        // Testar PUT
        console.log('\n📤 Salvando novas configurações...');
        const putResponse = await fetch(`${API_URL}/config/${SUBDOMINIO}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosConfig)
        });
        
        const putResult = await putResponse.json();
        console.log('Resultado do PUT:', putResult);

        // Testar GET depois
        console.log('\n📥 Buscando configurações após salvamento...');
        const getDepois = await fetch(`${API_URL}/config/${SUBDOMINIO}`);
        const dadosDepois = await getDepois.json();
        console.log('Configurações após salvar:', dadosDepois);

        // Verificar se salvou
        if (dadosDepois.nome_loja === dadosConfig.nome_loja) {
            console.log('\n✅ SUCESSO! Dados foram salvos!');
        } else {
            console.log('\n❌ FALHA! Dados não foram salvos!');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testarSalvar();