// database/migrations/01_create_tables.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('📁 Carregando .env de:', path.join(__dirname, '../../.env'));
console.log('📊 Usuário:', process.env.DB_USER);
console.log('📊 Banco:', process.env.DB_NAME);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const createTables = async () => {
    try {
        console.log('🔄 Conectando ao banco de dados...');
        await pool.connect();
        console.log('✅ Conectado ao PostgreSQL!');
        
        console.log('🔄 Criando tabelas...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                subdominio VARCHAR(50) UNIQUE NOT NULL,
                cor_principal VARCHAR(20) DEFAULT '#C83232',
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categorias (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                nome VARCHAR(50) NOT NULL,
                ordem INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS produtos (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                categoria_id INTEGER REFERENCES categorias(id),
                nome VARCHAR(100) NOT NULL,
                preco DECIMAL(10,2) NOT NULL,
                disponivel BOOLEAN DEFAULT true
            );
        `);

        console.log('✅ Tabelas criadas!');

        // Inserir dados da DL
        await pool.query(`
            INSERT INTO tenants (nome, subdominio)
            SELECT 'DL Crepes e Lanches', 'dlcrepes'
            WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE subdominio = 'dlcrepes');
        `);

        console.log('✅ Dados da DL Crepes inseridos!');
        
        // Mostrar resultado
        const result = await pool.query('SELECT * FROM tenants');
        console.log('📊 Tenants cadastrados:', result.rows);
        
    } catch (error) {
        console.error('❌ Erro detalhado:');
        console.error('   Mensagem:', error.message);
        console.error('   Código:', error.code);
    } finally {
        await pool.end();
        console.log('🔌 Conexão fechada');
    }
};

createTables();