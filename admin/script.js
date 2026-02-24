// admin/script.js
const API_URL = 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

console.log('🚀 Admin iniciado');
console.log('📡 API_URL:', API_URL);

// ===== LOGIN =====
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            
            if (email === 'admin@dlcrepes.com' && senha === 'admin123') {
                localStorage.setItem('adminLogado', 'true');
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('loginError').textContent = 'E-mail ou senha inválidos';
            }
        });
    }
    
    const paginasProtegidas = ['dashboard.html', 'produtos.html', 'categorias.html', 'pedidos.html', 'config.html'];
    const paginaAtual = window.location.pathname.split('/').pop();
    
    if (paginasProtegidas.includes(paginaAtual) && !localStorage.getItem('adminLogado')) {
        window.location.href = 'index.html';
    }
    
    if (paginaAtual === 'dashboard.html') {
        carregarDashboard();
    } else if (paginaAtual === 'produtos.html') {
        carregarProdutos();
    } else if (paginaAtual === 'categorias.html') {
        carregarCategorias();
    }
});

function logout() {
    localStorage.removeItem('adminLogado');
    window.location.href = 'index.html';
}

async function testarConexao() {
    try {
        const response = await fetch(`${API_URL}/teste`);
        const data = await response.json();
        console.log('✅ API OK:', data);
        return true;
    } catch (error) {
        console.error('❌ API erro:', error);
        alert(`Erro de conexão com ${API_URL}`);
        return false;
    }
}

// ===== DASHBOARD =====
async function carregarDashboard() {
    if (!await testarConexao()) return;
    
    try {
        const response = await fetch(`${API_URL}/dashboard/${SUBDOMINIO}`);
        const data = await response.json();
        
        document.getElementById('pedidosHoje').textContent = data.hoje.pedidos || 0;
        document.getElementById('faturamentoHoje').textContent = 
            `R$ ${(data.hoje.faturamento || 0).toFixed(2)}`;
            
        const tbody = document.getElementById('pedidosTable');
        if (tbody) {
            tbody.innerHTML = (data.ultimos_pedidos || []).map(p => `
                <tr>
                    <td>#${p.id}</td>
                    <td>${p.cliente_nome}</td>
                    <td>R$ ${p.total.toFixed(2)}</td>
                    <td><span class="status-${p.status}">${p.status}</span></td>
                    <td>${new Date(p.data_pedido).toLocaleString('pt-BR')}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Erro dashboard:', error);
    }
}

// ===== PRODUTOS =====
async function carregarProdutos() {
    if (!await testarConexao()) return;
    
    try {
        const response = await fetch(`${API_URL}/produtos`);
        const produtos = await response.json();
        
        const tbody = document.getElementById('produtosTable');
        if (tbody) {
            tbody.innerHTML = produtos.map(p => `
                <tr>
                    <td>${p.nome}</td>
                    <td>R$ ${parseFloat(p.preco).toFixed(2)}</td>
                    <td>${p.categoria_nome || '-'}</td>
                    <td>
                        <button class="btn-edit" onclick="editarProduto(${p.id})">Editar</button>
                        <button class="btn-delete" onclick="excluirProduto(${p.id})">Excluir</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Erro produtos:', error);
        const tbody = document.getElementById('produtosTable');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar</td></tr>';
    }
}

async function excluirProduto(id) {
    if (!confirm('Excluir produto?')) return;
    
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('✅ Excluído');
            carregarProdutos();
        }
    } catch (error) {
        alert('Erro');
    }
}

// ===== CATEGORIAS =====
async function carregarCategorias() {
    if (!await testarConexao()) return;
    
    try {
        const response = await fetch(`${API_URL}/categorias`);
        const categorias = await response.json();
        
        const tbody = document.getElementById('categoriasTable');
        if (tbody) {
            tbody.innerHTML = categorias.map(c => `
                <tr>
                    <td>${c.nome}</td>
                    <td>${c.ordem || 0}</td>
                    <td>
                        <button class="btn-edit" onclick="editarCategoria(${c.id})">Editar</button>
                        <button class="btn-delete" onclick="excluirCategoria(${c.id})">Excluir</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Erro categorias:', error);
        const tbody = document.getElementById('categoriasTable');
        if (tbody) tbody.innerHTML = '<tr><td colspan="3">Erro</td></tr>';
    }
}

async function excluirCategoria(id) {
    if (!confirm('Excluir categoria?')) return;
    
    try {
        const response = await fetch(`${API_URL}/categorias/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('✅ Excluído');
            carregarCategorias();
        }
    } catch (error) {
        alert('Erro');
    }
}
