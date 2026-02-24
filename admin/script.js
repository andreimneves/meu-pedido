// admin/script.js - VERSÃO FINAL CORRIGIDA
const API_URL = 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

// Cache
let cache = {
    produtos: { data: null, timestamp: 0 },
    categorias: { data: null, timestamp: 0 },
    pedidos: { data: null, timestamp: 0 }
};
const CACHE_DURATION = 30000;

// Variáveis globais
let produtoEditando = null;
let categoriaEditando = null;
let categoriasCache = [];

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
    
    // Carregar dados específicos da página
    if (paginaAtual === 'dashboard.html') {
        carregarDashboard();
        setInterval(carregarDashboard, 30000);
    } else if (paginaAtual === 'produtos.html') {
        carregarProdutos();
        carregarCategoriasSelect();
    } else if (paginaAtual === 'categorias.html') {
        carregarCategorias();
    } else if (paginaAtual === 'pedidos.html') {
        carregarPedidos();
        setInterval(carregarPedidos, 30000);
    }
});

function logout() {
    localStorage.removeItem('adminLogado');
    window.location.href = 'index.html';
}

// ===== UTILITÁRIOS =====
async function fetchComCache(url, cacheKey) {
    const agora = Date.now();
    if (cache[cacheKey] && cache[cacheKey].data && (agora - cache[cacheKey].timestamp) < CACHE_DURATION) {
        return cache[cacheKey].data;
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        cache[cacheKey] = { data, timestamp: agora };
        return data;
    } catch (error) {
        console.error(`Erro ao buscar ${url}:`, error);
        throw error;
    }
}

// ===== DASHBOARD =====
async function carregarDashboard() {
    try {
        const [dashboardData, produtosData, categoriasData] = await Promise.all([
            fetchComCache(`${API_URL}/dashboard/${SUBDOMINIO}`, 'dashboard').catch(() => null),
            fetchComCache(`${API_URL}/produtos`, 'produtos').catch(() => ({ length: 0 })),
            fetchComCache(`${API_URL}/categorias`, 'categorias').catch(() => ({ length: 0 }))
        ]);
        
        if (dashboardData) {
            document.getElementById('pedidosHoje').textContent = dashboardData.hoje?.pedidos || 0;
            document.getElementById('faturamentoHoje').textContent = `R$ ${(dashboardData.hoje?.faturamento || 0).toFixed(2)}`;
        }
        
        document.getElementById('totalProdutos').textContent = produtosData.length || 0;
        document.getElementById('totalCategorias').textContent = categoriasData.length || 0;
        
        const tbody = document.getElementById('pedidosTable');
        if (tbody && dashboardData && dashboardData.ultimos_pedidos) {
            tbody.innerHTML = dashboardData.ultimos_pedidos.map(p => `
                <tr>
                    <td>#${p.id}</td>
                    <td>${p.cliente_nome}</td>
                    <td>R$ ${parseFloat(p.total).toFixed(2)}</td>
                    <td><span class="status-${p.status}">${p.status}</span></td>
                    <td>${new Date(p.data_pedido).toLocaleString('pt-BR')}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Erro no dashboard:', error);
    }
}

// ===== PRODUTOS =====
async function carregarProdutos() {
    try {
        const produtos = await fetchComCache(`${API_URL}/produtos`, 'produtos');
        const tbody = document.getElementById('produtosTable');
        if (tbody) {
            if (produtos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Nenhum produto cadastrado</td></tr>';
            } else {
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
        }
    } catch (error) {
        console.error('Erro produtos:', error);
        const tbody = document.getElementById('produtosTable');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="color:red">Erro ao carregar produtos</td></tr>';
    }
}

async function carregarCategoriasSelect() {
    try {
        const categorias = await fetchComCache(`${API_URL}/categorias`, 'categorias');
        categoriasCache = categorias;
        const select = document.getElementById('produtoCategoria');
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>' + 
                categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

// Funções globais para produto
window.abrirModalProduto = function() {
    console.log('Abrindo modal para novo produto');
    produtoEditando = null;
    document.getElementById('modalTituloProduto').textContent = 'Novo Produto';
    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoPreco').value = '';
    document.getElementById('produtoCategoria').value = '';
    document.getElementById('produtoModal').style.display = 'block';
};

window.editarProduto = async function(id) {
    console.log('Editando produto ID:', id);
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar produto');
        const produto = await response.json();
        console.log('Produto carregado:', produto);
        
        produtoEditando = produto;
        document.getElementById('modalTituloProduto').textContent = 'Editar Produto';
        document.getElementById('produtoNome').value = produto.nome;
        document.getElementById('produtoPreco').value = produto.preco;
        
        // Garantir que as categorias estejam carregadas
        if (categoriasCache.length === 0) {
            await carregarCategoriasSelect();
        }
        document.getElementById('produtoCategoria').value = produto.categoria_id || '';
        document.getElementById('produtoModal').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        alert('Erro ao carregar produto para edição: ' + error.message);
    }
};

window.excluirProduto = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            cache.produtos.timestamp = 0;
            await carregarProdutos();
            alert('✅ Produto excluído!');
        } else {
            const erro = await response.json();
            alert('Erro ao excluir: ' + (erro.erro || 'Erro desconhecido'));
        }
    } catch (error) {
        alert('Erro de conexão: ' + error.message);
    }
};

window.salvarProduto = async function() {
    console.log('Salvando produto...');
    const nome = document.getElementById('produtoNome').value;
    const preco = document.getElementById('produtoPreco').value;
    const categoriaId = document.getElementById('produtoCategoria').value;
    
    if (!nome || !preco) {
        alert('Preencha nome e preço do produto');
        return;
    }
    
    const produto = {
        nome,
        preco: parseFloat(preco),
        categoria_id: categoriaId || null,
        tenant_id: 1,
        disponivel: true
    };
    
    console.log('Dados do produto:', produto);
    console.log('Editando?', produtoEditando ? 'Sim' : 'Não');
    
    try {
        let response;
        if (produtoEditando) {
            console.log('Enviando PUT para:', `${API_URL}/produtos/${produtoEditando.id}`);
            response = await fetch(`${API_URL}/produtos/${produtoEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto)
            });
        } else {
            console.log('Enviando POST para:', `${API_URL}/produtos`);
            response = await fetch(`${API_URL}/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto)
            });
        }
        
        console.log('Status da resposta:', response.status);
        
        if (response.ok) {
            document.getElementById('produtoModal').style.display = 'none';
            cache.produtos.timestamp = 0;
            await carregarProdutos();
            alert('✅ Produto salvo com sucesso!');
        } else {
            const erro = await response.json();
            console.error('Erro da API:', erro);
            alert('Erro: ' + (erro.erro || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        alert('Erro de conexão: ' + error.message);
    }
};

// ===== CATEGORIAS =====
async function carregarCategorias() {
    try {
        const categorias = await fetchComCache(`${API_URL}/categorias`, 'categorias');
        const tbody = document.getElementById('categoriasTable');
        if (tbody) {
            if (categorias.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3">Nenhuma categoria cadastrada</td></tr>';
            } else {
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
        }
    } catch (error) {
        console.error('Erro categorias:', error);
        const tbody = document.getElementById('categoriasTable');
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="color:red">Erro ao carregar</td></tr>';
    }
}

async function excluirCategoria(id) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    
    try {
        const response = await fetch(`${API_URL}/categorias/${id}`, { method: 'DELETE' });
        if (response.ok) {
            cache.categorias.timestamp = 0;
            await carregarCategorias();
            alert('✅ Categoria excluída!');
        } else {
            alert('Erro ao excluir categoria');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}

// ===== PEDIDOS =====
async function carregarPedidos() {
    try {
        const pedidos = await fetchComCache(`${API_URL}/pedidos/${SUBDOMINIO}`, 'pedidos');
        const tbody = document.getElementById('pedidosTable');
        if (!tbody) return;
        
        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Nenhum pedido encontrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = pedidos.map(p => {
            const data = new Date(p.data_pedido).toLocaleString('pt-BR');
            return `
                <tr>
                    <td>#${p.id}</td>
                    <td>${p.cliente_nome}</td>
                    <td>${p.cliente_telefone}</td>
                    <td>R$ ${parseFloat(p.total).toFixed(2)}</td>
                    <td><span class="status-${p.status}">${p.status}</span></td>
                    <td>${data}</td>
                    <td>
                        <a href="pedido-detalhe.html?id=${p.id}" class="btn-view">👁️ Detalhes</a>
                        <select class="status-select" onchange="atualizarStatus(${p.id}, this.value)">
                            <option value="novo" ${p.status === 'novo' ? 'selected' : ''}>Novo</option>
                            <option value="preparando" ${p.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                            <option value="pronto" ${p.status === 'pronto' ? 'selected' : ''}>Pronto</option>
                            <option value="entregue" ${p.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                            <option value="cancelado" ${p.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro pedidos:', error);
        const tbody = document.getElementById('pedidosTable');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="color:red">Erro ao carregar pedidos</td></tr>';
    }
}

async function atualizarStatus(pedidoId, novoStatus) {
    try {
        const response = await fetch(`${API_URL}/pedidos/${SUBDOMINIO}/${pedidoId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });
        
        if (response.ok) {
            cache.pedidos.timestamp = 0;
            await carregarPedidos();
        } else {
            alert('Erro ao atualizar status');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}