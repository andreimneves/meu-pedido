// admin/script.js
const API_URL = 'http://localhost:3000/api';

// ===== LOGIN =====
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se está na página de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            
            // Login simples para teste
            if (email === 'admin@dlcrepes.com' && senha === 'admin123') {
                localStorage.setItem('adminLogado', 'true');
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('loginError').textContent = 'E-mail ou senha inválidos';
            }
        });
    }
    
    // Verificar se está logado em páginas protegidas
    const paginasProtegidas = ['dashboard.html', 'produtos.html', 'categorias.html', 'pedidos.html', 'config.html'];
    const paginaAtual = window.location.pathname.split('/').pop();
    
    if (paginasProtegidas.includes(paginaAtual) && !localStorage.getItem('adminLogado')) {
        window.location.href = 'index.html';
    }
    
    // Inicializar conforme a página
    if (paginaAtual === 'produtos.html') {
        carregarProdutos();
    } else if (paginaAtual === 'categorias.html') {
        carregarCategorias();
    } else if (paginaAtual === 'dashboard.html') {
        carregarDashboard();
    }
});

// Logout
function logout() {
    localStorage.removeItem('adminLogado');
    window.location.href = 'index.html';
}

// ===== PRODUTOS =====
let produtos = [];
let produtoEditando = null;

async function carregarProdutos() {
    try {
        console.log('Carregando produtos...');
        const response = await fetch(`${API_URL}/produtos`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        produtos = await response.json();
        console.log('Produtos carregados:', produtos);
        exibirProdutos();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        const tbody = document.getElementById('produtosTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" style="color: red; text-align: center;">
                ❌ Erro ao carregar produtos: ${error.message}<br>
                Verifique se o backend está rodando em ${API_URL}
            </td></tr>`;
        }
    }
}

function exibirProdutos() {
    const tbody = document.getElementById('produtosTable');
    if (!tbody) return;
    
    if (!produtos || produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum produto cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = produtos.map(p => `
        <tr>
            <td>${p.nome || ''}</td>
            <td>R$ ${p.preco ? parseFloat(p.preco).toFixed(2) : '0,00'}</td>
            <td>${p.categoria_nome || 'Sem categoria'}</td>
            <td>
                <button class="btn-edit" onclick="editarProduto(${p.id})">Editar</button>
                <button class="btn-delete" onclick="excluirProduto(${p.id})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function abrirModalProduto() {
    produtoEditando = null;
    document.getElementById('modalTitulo').textContent = 'Novo Produto';
    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoPreco').value = '';
    document.getElementById('produtoCategoria').value = '';
    document.getElementById('produtoModal').style.display = 'block';
}

function editarProduto(id) {
    produtoEditando = produtos.find(p => p.id === id);
    if (!produtoEditando) return;
    
    document.getElementById('modalTitulo').textContent = 'Editar Produto';
    document.getElementById('produtoNome').value = produtoEditando.nome || '';
    document.getElementById('produtoPreco').value = produtoEditando.preco || '';
    document.getElementById('produtoCategoria').value = produtoEditando.categoria_id || '';
    document.getElementById('produtoModal').style.display = 'block';
}

async function salvarProduto() {
    const nome = document.getElementById('produtoNome').value;
    const preco = document.getElementById('produtoPreco').value;
    const categoriaId = document.getElementById('produtoCategoria').value;
    
    if (!nome || !preco) {
        alert('Preencha nome e preço do produto');
        return;
    }
    
    const produto = {
        nome: nome,
        preco: parseFloat(preco),
        categoria_id: categoriaId ? parseInt(categoriaId) : null
    };
    
    try {
        let response;
        
        if (produtoEditando) {
            // Editar
            response = await fetch(`${API_URL}/produtos/${produtoEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto)
            });
        } else {
            // Criar
            response = await fetch(`${API_URL}/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto)
            });
        }
        
        if (response.ok) {
            document.getElementById('produtoModal').style.display = 'none';
            await carregarProdutos();
            alert('Produto salvo com sucesso!');
        } else {
            const erro = await response.json();
            alert('Erro ao salvar: ' + (erro.erro || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    }
}

async function excluirProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await carregarProdutos();
            alert('Produto excluído com sucesso!');
        } else {
            const erro = await response.json();
            alert('Erro ao excluir: ' + (erro.erro || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

function fecharModal() {
    document.getElementById('produtoModal').style.display = 'none';
}

// ===== CATEGORIAS =====
let categorias = [];
let categoriaEditando = null;

async function carregarCategorias() {
    try {
        console.log('Carregando categorias...');
        const response = await fetch(`${API_URL}/categorias`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        categorias = await response.json();
        console.log('Categorias carregadas:', categorias);
        exibirCategorias();
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        const tbody = document.getElementById('categoriasTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" style="color: red; text-align: center;">
                ❌ Erro ao carregar categorias: ${error.message}
            </td></tr>`;
        }
    }
}

function exibirCategorias() {
    const tbody = document.getElementById('categoriasTable');
    if (!tbody) return;
    
    if (!categorias || categorias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhuma categoria cadastrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = categorias.map(c => `
        <tr>
            <td>${c.nome || ''}</td>
            <td>${c.ordem || 0}</td>
            <td>
                <button class="btn-edit" onclick="editarCategoria(${c.id})">Editar</button>
                <button class="btn-delete" onclick="excluirCategoria(${c.id})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function abrirModalCategoria() {
    categoriaEditando = null;
    document.getElementById('modalTituloCategoria').textContent = 'Nova Categoria';
    document.getElementById('categoriaNome').value = '';
    document.getElementById('categoriaOrdem').value = '0';
    document.getElementById('categoriaModal').style.display = 'block';
}

function editarCategoria(id) {
    categoriaEditando = categorias.find(c => c.id === id);
    if (!categoriaEditando) return;
    
    document.getElementById('modalTituloCategoria').textContent = 'Editar Categoria';
    document.getElementById('categoriaNome').value = categoriaEditando.nome || '';
    document.getElementById('categoriaOrdem').value = categoriaEditando.ordem || 0;
    document.getElementById('categoriaModal').style.display = 'block';
}

async function salvarCategoria() {
    const nome = document.getElementById('categoriaNome').value;
    const ordem = document.getElementById('categoriaOrdem').value;
    
    if (!nome) {
        alert('Digite o nome da categoria');
        return;
    }
    
    const categoria = {
        nome: nome,
        ordem: parseInt(ordem) || 0
    };
    
    try {
        let response;
        
        if (categoriaEditando) {
            response = await fetch(`${API_URL}/categorias/${categoriaEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoria)
            });
        } else {
            response = await fetch(`${API_URL}/categorias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoria)
            });
        }
        
        if (response.ok) {
            document.getElementById('categoriaModal').style.display = 'none';
            await carregarCategorias();
            alert('Categoria salva com sucesso!');
        } else {
            const erro = await response.json();
            alert('Erro ao salvar: ' + (erro.erro || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

async function excluirCategoria(id) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/categorias/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await carregarCategorias();
            alert('Categoria excluída com sucesso!');
        } else {
            const erro = await response.json();
            alert('Erro ao excluir: ' + (erro.erro || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

function fecharModalCategoria() {
    document.getElementById('categoriaModal').style.display = 'none';
}

// ===== DASHBOARD =====
async function carregarDashboard() {
    try {
        // Carregar produtos
        const responseProdutos = await fetch(`${API_URL}/produtos`);
        const produtos = await responseProdutos.json();
        document.getElementById('totalProdutos').textContent = produtos.length;
        
        // Carregar categorias
        const responseCategorias = await fetch(`${API_URL}/categorias`);
        const categorias = await responseCategorias.json();
        document.getElementById('totalCategorias').textContent = categorias.length;
        
        // Produtos em destaque (primeiros 5)
        const destaques = produtos.slice(0, 5);
        const tbody = document.getElementById('destaquesBody');
        if (tbody) {
            tbody.innerHTML = destaques.map(p => `
                <tr>
                    <td>${p.nome}</td>
                    <td>R$ ${parseFloat(p.preco).toFixed(2)}</td>
                    <td>${p.categoria_nome || '-'}</td>
                </tr>
            `).join('');
        }
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}