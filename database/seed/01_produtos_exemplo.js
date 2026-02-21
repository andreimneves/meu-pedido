// database/seed/01_produtos_exemplo.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Carregar .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const inserirProdutos = async () => {
    try {
        console.log('🔄 Inserindo produtos da DL Crepes...');
        
        // Buscar o ID da DL Crepes
        const tenant = await pool.query(
            "SELECT id FROM tenants WHERE subdominio = 'dlcrepes'"
        );
        
        if (tenant.rows.length === 0) {
            console.log('❌ DL Crepes não encontrada!');
            return;
        }
        
        const tenantId = tenant.rows[0].id;
        console.log('✅ DL Crepes encontrada. ID:', tenantId);
        
        // Buscar categorias
        const categorias = await pool.query(
            "SELECT id, nome FROM categorias WHERE tenant_id = $1",
            [tenantId]
        );
        
        // Criar mapa de categorias
        const catMap = {};
        categorias.rows.forEach(c => {
            catMap[c.nome] = c.id;
            console.log(`📁 Categoria: ${c.nome} -> ID: ${c.id}`);
        });
        
        // Lista de produtos da DL Crepes
        const produtos = [
            // CREPES SALGADOS
            { nome: 'Crepe de Frango com Catupiry', preco: 22.00, categoria: 'Crepes Salgados' },
            { nome: 'Crepe de Calabresa', preco: 20.00, categoria: 'Crepes Salgados' },
            { nome: 'Crepe de Quatro Queijos', preco: 23.00, categoria: 'Crepes Salgados' },
            { nome: 'Crepe de Carne com Queijo', preco: 22.00, categoria: 'Crepes Salgados' },
            
            // CREPES DOCES
            { nome: 'Crepe de Chocolate com Morango', preco: 18.00, categoria: 'Crepes Doces' },
            { nome: 'Crepe de Doce de Leite', preco: 16.00, categoria: 'Crepes Doces' },
            { nome: 'Crepe de Banana com Canela', preco: 15.00, categoria: 'Crepes Doces' },
            { nome: 'Crepe de Nutella', preco: 20.00, categoria: 'Crepes Doces' },
            
            // PASTÉIS
            { nome: 'Pastel de Carne', preco: 8.00, categoria: 'Pastéis' },
            { nome: 'Pastel de Queijo', preco: 7.00, categoria: 'Pastéis' },
            { nome: 'Pastel de Frango', preco: 8.00, categoria: 'Pastéis' },
            { nome: 'Pastel de Pizza', preco: 9.00, categoria: 'Pastéis' },
            
            // AÇAÍ
            { nome: 'Açaí 300ml', preco: 15.00, categoria: 'Açaí' },
            { nome: 'Açaí 500ml', preco: 20.00, categoria: 'Açaí' },
            { nome: 'Açaí com Granola', preco: 18.00, categoria: 'Açaí' },
            { nome: 'Açaí com Banana', preco: 19.00, categoria: 'Açaí' },
            
            // BEBIDAS
            { nome: 'Coca-Cola 350ml', preco: 5.00, categoria: 'Bebidas' },
            { nome: 'Guaraná 350ml', preco: 5.00, categoria: 'Bebidas' },
            { nome: 'Água 500ml', preco: 3.00, categoria: 'Bebidas' },
            { nome: 'Suco de Laranja', preco: 7.00, categoria: 'Bebidas' },
        ];
        
        console.log('\n🔄 Inserindo produtos...');
        
        for (const p of produtos) {
            const categoriaId = catMap[p.categoria];
            if (!categoriaId) {
                console.log(`⚠️ Categoria não encontrada: ${p.categoria}`);
                continue;
            }
            
            await pool.query(
                `INSERT INTO produtos (tenant_id, categoria_id, nome, preco, disponivel)
                 VALUES ($1, $2, $3, $4, true)`,
                [tenantId, categoriaId, p.nome, p.preco]
            );
            console.log(`✅ Produto: ${p.nome} - R$ ${p.preco.toFixed(2)}`);
        }
        
        console.log('\n🎉 TODOS OS PRODUTOS INSERIDOS COM SUCESSO!');
        
        // Mostrar resumo
        const count = await pool.query(
            "SELECT COUNT(*) as total FROM produtos WHERE tenant_id = $1",
            [tenantId]
        );
        console.log(`📊 Total de produtos cadastrados: ${count.rows[0].total}`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
        console.log('🔌 Conexão fechada');
    }
};

inserirProdutos();