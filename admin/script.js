// admin/script.js - VERSÃO COMPLETA E DEFINITIVA

var API_URL = 'https://meu-pedido-backend.onrender.com/api';
var SUBDOMINIO = 'dlcrepes';

// Cache para otimização (usando var para evitar erro de duplicidade)
var cache = {
    produtos: { data: null, timestamp: 0 },
    categorias: { data: null, timestamp: 0 },
    pedidos: { data: null, timestamp: 0 },
    config: { data: null, timestamp: 0 }
};
var CACHE_DURATION = 30000; // 30 segundos

// Variáveis globais (usando var para evitar erro de duplicidade)
var produtoEditando = null;
var categoriaEditando = null;
var categoriasCache = [];

console.log('🚀 Admin iniciado');
console.log('📡 API_URL:', API_URL);

// ===== NOTIFICAÇÕES =====
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao ${tipo}`;
    notificacao.textContent = mensagem;
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        background: ${tipo === 'sucesso' ? '#4CAF50' : tipo === 'erro' ? '#f44336' : '#2196F3'};
    `;
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacao.remove(), 300);
    }, 3000);
}

// Adicionar CSS das animações se não existir
if (!document.getElementById('notificacao-style')) {
    const style = document.createElement('style');
    style.id = 'notificacao-style';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ===== LOGIN E INICIALIZAÇÃO =====
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
    
    const paginasProtegidas = ['dashboard.html', 'produtos.html', 'categorias.html', 'pedidos.html', 'config.html', 'pedido-detalhe.html', 'complementos.html'];
    const paginaAtual = window.location.pathname.split('/').pop();
    
    if (paginasProtegidas.includes(paginaAtual) && !localStorage.getItem('adminLogado')) {
        window.location.href = 'index.html';
    }
    
    // Roteador de funções por página
    if (paginaAtual === 'dashboard.html') {
        if (typeof carregarDashboard === 'function') {
            carregarDashboard();
            setInterval(carregarDashboard, 30000);
        }
    } else if (paginaAtual === 'produtos.html') {
        carregarProdutos();
        carregarCategoriasSelect();
        setupUploadImagem(); 
    } else if (paginaAtual === 'categorias.html') {
        carregarCategorias();
    } else if (paginaAtual === 'pedidos.html') {
        // Verifica se a função existe para não dar conflito com o código inline do pedidos.html
        if (typeof carregarPedidos === 'function' && typeof filtrarPedidos === 'undefined') {
            carregarPedidos();
            setInterval(carregarPedidos, 30000);
        }
    }
});

window.logout = function() {
    localStorage.removeItem('adminLogado');
    window.location.href = 'index.html';
};

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

// ===== PRODUTOS =====
window.carregarProdutos = async function() {
    console.log('🔄 Carregando produtos...');
    const tbody = document.getElementById('produtosTable');
    if (!tbody) return;

    try {
        const resposta = await fetchComCache(`${API_URL}/produtos`, 'produtos');
        const produtos = Array.isArray(resposta) ? resposta : (resposta.data || []);

        if (produtos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum produto cadastrado</td></tr>';
            return;
        }

        tbody.innerHTML = produtos.map(p => {
            const imagemHtml = p.imagem_url
                ? `<img src="${p.imagem_url}" class="preview-imagem" alt="${p.nome}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">`
                : `<div class="imagem-placeholder" style="width:50px; height:50px; display:flex; align-items:center; justify-content:center; background:#f0f0f0; border-radius:5px;">🖼️</div>`;

            return `
                <tr>
                    <td>${imagemHtml}</td>
                    <td>${p.nome}</td>
                    <td>R$ ${parseFloat(p.preco || 0).toFixed(2)}</td>
                    <td>${p.categoria_nome || '-'}</td>
                    <td>
                        <button class="btn-edit" onclick="editarProduto(${p.id})">Editar</button>
                        <button class="btn-delete" onclick="excluirProduto(${p.id})">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center; padding:20px;">
            Erro ao carregar produtos. Atualize a página e tente novamente.
        </td></tr>`;
    }
};

window.carregarCategoriasSelect = async function() {
    try {
        const categorias = await fetchComCache(`${API_URL}/categorias`, 'categorias');
        categoriasCache = categorias;
        
        const select = document.getElementById('produtoCategoria');
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>' + 
                categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar categorias no select:', error);
    }
};

window.abrirModalProduto = function() {
    produtoEditando = null;
    document.getElementById('modalTituloProduto').textContent = 'Novo Produto';
    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoPreco').value = '';
    document.getElementById('produtoCategoria').value = '';
    document.getElementById('produtoDescricao').value = '';
    document.getElementById('produtoDestaque').checked = false;
    document.getElementById('produtoDisponivel').checked = true;
    
    removerImagem(); // Limpa a imagem anterior se houver
    
    document.getElementById('produtoModal').style.display = 'block';
};

window.fecharModalProduto = function() {
    const modal = document.getElementById('produtoModal');
    if (modal) modal.style.display = 'none';
};

window.editarProduto = async function(id) {
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar produto');
        const produto = await response.json();
        
        produtoEditando = produto;
        document.getElementById('modalTituloProduto').textContent = 'Editar Produto';
        document.getElementById('produtoNome').value = produto.nome;
        document.getElementById('produtoPreco').value = produto.preco;
        document.getElementById('produtoDescricao').value = produto.descricao || '';
        document.getElementById('produtoDestaque').checked = produto.destaque || false;
        document.getElementById('produtoDisponivel').checked = produto.disponivel !== false;
        
        // Preview da imagem
        const preview = document.getElementById('previewImagem');
        const placeholder = document.getElementById('previewPlaceholder');
        const btnRemove = document.getElementById('btnRemoverImagem');
        const inputHidden = document.getElementById('produtoImagem');
        
        if (produto.imagem_url) {
            if (inputHidden) inputHidden.value = produto.imagem_url;
            if (preview) {
                preview.src = produto.imagem_url;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'inline-block';
        } else {
            removerImagem();
        }
        
        if (categoriasCache.length === 0) {
            await carregarCategoriasSelect();
        }
        document.getElementById('produtoCategoria').value = produto.categoria_id || '';
        document.getElementById('produtoModal').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        mostrarNotificacao('Erro ao carregar produto: ' + error.message, 'erro');
    }
};

window.salvarProduto = async function() {
    const nome = document.getElementById('produtoNome').value;
    const preco = document.getElementById('produtoPreco').value;
    const categoriaId = document.getElementById('produtoCategoria').value;
    const descricao = document.getElementById('produtoDescricao').value;
    const imagem_url = document.getElementById('produtoImagem') ? document.getElementById('produtoImagem').value : null;
    const destaque = document.getElementById('produtoDestaque').checked;
    const disponivel = document.getElementById('produtoDisponivel').checked;
    
    if (!nome || !preco) {
        mostrarNotificacao('Preencha nome e preço', 'erro');
        return;
    }
    
    const produto = {
        nome,
        preco: parseFloat(preco),
        categoria_id: categoriaId || null,
        descricao: descricao || '',
        imagem_url: imagem_url || null,
        destaque,
        disponivel,
        tenant_id: 1 // Ajuste conforme seu sistema
    };
    
    try {
        let response;
        if (produtoEditando) {
            response = await fetch(`${API_URL}/produtos/${produtoEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto)
            });
        } else {
            response = await fetch(`${API_URL}/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produto)
            });
        }
        
        if (response.ok) {
            fecharModalProduto();
            cache.produtos.timestamp = 0; // Invalida cache
            await carregarProdutos();
            mostrarNotificacao('✅ Produto salvo com sucesso!', 'sucesso');
        } else {
            const erro = await response.json();
            mostrarNotificacao('Erro: ' + (erro.erro || 'Erro desconhecido'), 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão: ' + error.message, 'erro');
    }
};

window.excluirProduto = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, { 
            method: 'DELETE' 
        });
        
        if (response.ok) {
            cache.produtos.timestamp = 0;
            await carregarProdutos();
            mostrarNotificacao('✅ Produto excluído!', 'sucesso');
        } else {
            const erro = await response.json();
            mostrarNotificacao('Erro: ' + (erro.erro || 'Erro ao excluir'), 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão: ' + error.message, 'erro');
    }
};

// ===== UPLOAD DE IMAGEM PARA PRODUTOS =====
window.setupUploadImagem = function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea && fileInput) {
        uploadArea.onclick = () => fileInput.click();
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                uploadImagemServidor(e.dataTransfer.files[0]);
            }
        });

        fileInput.onchange = function() {
            if (this.files.length) {
                uploadImagemServidor(this.files[0]);
            }
        };
    }
};

window.uploadImagemServidor = async function(file) {
    if (!file.type.startsWith('image/')) {
        mostrarNotificacao('Selecione uma imagem válida', 'erro');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        mostrarNotificacao('A imagem deve ter no máximo 5MB', 'erro');
        return;
    }

    // Preview local imediato
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('previewImagem');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        const placeholder = document.getElementById('previewPlaceholder');
        if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);

    // Upload
    const formData = new FormData();
    formData.append('imagem', file);
    
    const progressBar = document.getElementById('uploadProgress');
    const progressDiv = progressBar ? progressBar.querySelector('div') : null;
    
    if (progressBar) {
        progressBar.style.display = 'block';
        if (progressDiv) progressDiv.style.width = '50%';
    }
    
    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            const imgInput = document.getElementById('produtoImagem');
            if (imgInput) imgInput.value = data.arquivo.url;
            
            const preview = document.getElementById('previewImagem');
            if (preview) preview.src = data.arquivo.url; 
            
            const btnRemove = document.getElementById('btnRemoverImagem');
            if (btnRemove) btnRemove.style.display = 'inline-block';
            
            if (progressBar) progressBar.style.display = 'none';
            mostrarNotificacao('✅ Imagem enviada com sucesso!', 'sucesso');
        } else {
            throw new Error('Falha no upload');
        }
    } catch (error) {
        if (progressBar) progressBar.style.display = 'none';
        mostrarNotificacao('❌ Erro no upload da imagem', 'erro');
        console.error('Erro de upload:', error);
    }
};

window.removerImagem = function() {
    const inputHidden = document.getElementById('produtoImagem');
    if (inputHidden) inputHidden.value = '';
    
    const preview = document.getElementById('previewImagem');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    
    const placeholder = document.getElementById('previewPlaceholder');
    if (placeholder) placeholder.style.display = 'flex';
    
    const btnRemove = document.getElementById('btnRemoverImagem');
    if (btnRemove) btnRemove.style.display = 'none';
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
};

// ===== CATEGORIAS =====
window.carregarCategorias = async function() {
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
};

window.abrirModalCategoria = function() {
    categoriaEditando = null;
    document.getElementById('modalTituloCategoria').textContent = 'Nova Categoria';
    document.getElementById('categoriaNome').value = '';
    document.getElementById('categoriaOrdem').value = '0';
    document.getElementById('categoriaModal').style.display = 'block';
};

window.editarCategoria = async function(id) {
    try {
        const response = await fetch(`${API_URL}/categorias/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar categoria');
        const categoria = await response.json();
        
        categoriaEditando = categoria;
        document.getElementById('modalTituloCategoria').textContent = 'Editar Categoria';
        document.getElementById('categoriaNome').value = categoria.nome;
        document.getElementById('categoriaOrdem').value = categoria.ordem || 0;
        document.getElementById('categoriaModal').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar categoria:', error);
        mostrarNotificacao('Erro ao carregar categoria: ' + error.message, 'erro');
    }
};

window.salvarCategoria = async function() {
    const nome = document.getElementById('categoriaNome').value;
    const ordem = document.getElementById('categoriaOrdem').value;
    
    if (!nome) {
        mostrarNotificacao('Digite o nome da categoria', 'aviso');
        return;
    }
    
    const categoria = { 
        nome, 
        ordem: parseInt(ordem) || 0,
        tenant_id: 1 
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
            fecharModalCategoria();
            cache.categorias.timestamp = 0;
            await carregarCategorias();
            mostrarNotificacao('✅ Categoria salva!', 'sucesso');
        } else {
            const erro = await response.json();
            mostrarNotificacao('Erro: ' + (erro.erro || 'Erro'), 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão: ' + error.message, 'erro');
    }
};

window.excluirCategoria = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    
    try {
        const response = await fetch(`${API_URL}/categorias/${id}`, { 
            method: 'DELETE' 
        });
        
        if (response.ok) {
            cache.categorias.timestamp = 0;
            await carregarCategorias();
            mostrarNotificacao('✅ Categoria excluída!', 'sucesso');
        } else {
            const erro = await response.json();
            mostrarNotificacao('Erro: ' + (erro.erro || 'Erro ao excluir'), 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão: ' + error.message, 'erro');
    }
};

window.fecharModalCategoria = function() {
    const modal = document.getElementById('categoriaModal');
    if (modal) modal.style.display = 'none';
};

// ===== DASHBOARD =====
window.carregarDashboard = async function() {
    try {
        const [dashboardData, produtosData, categoriasData] = await Promise.all([
            fetchComCache(`${API_URL}/dashboard/${SUBDOMINIO}`, 'dashboard').catch(() => null),
            fetchComCache(`${API_URL}/produtos`, 'produtos').catch(() => ({ length: 0 })),
            fetchComCache(`${API_URL}/categorias`, 'categorias').catch(() => ({ length: 0 }))
        ]);
        
        if (dashboardData) {
            const pedidosHoje = document.getElementById('pedidosHoje');
            const fatHoje = document.getElementById('faturamentoHoje');
            if(pedidosHoje) pedidosHoje.textContent = dashboardData.hoje?.pedidos || 0;
            if(fatHoje) fatHoje.textContent = `R$ ${(dashboardData.hoje?.faturamento || 0).toFixed(2)}`;
        }
        
        const totProd = document.getElementById('totalProdutos');
        const totCat = document.getElementById('totalCategorias');
        if(totProd) totProd.textContent = produtosData.length || 0;
        if(totCat) totCat.textContent = categoriasData.length || 0;
        
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
};

// ===== PEDIDOS =====
window.carregarPedidos = async function() {
    try {
        const pedidos = await fetchComCache(`${API_URL}/pedidos/${SUBDOMINIO}`, 'pedidos');
        const tbody = document.getElementById('pedidosTable');
        if (!tbody) return;
        
        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum pedido encontrado</td></tr>';
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
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center;">Erro ao carregar pedidos</td></tr>';
    }
};

window.atualizarStatus = async function(pedidoId, novoStatus) {
    try {
        const response = await fetch(`${API_URL}/pedidos/${SUBDOMINIO}/${pedidoId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });
        
        if (response.ok) {
            cache.pedidos.timestamp = 0;
            
            if (typeof aplicarFiltro === 'function') {
                // Se estiver no pedidos.html com filtros
                const res = await fetch(`${API_URL}/pedidos/${SUBDOMINIO}`);
                window.todosPedidos = await res.json();
                aplicarFiltro();
            } else {
                await carregarPedidos();
            }
            
            mostrarNotificacao('✅ Status atualizado!', 'sucesso');
        } else {
            const erro = await response.json();
            mostrarNotificacao('Erro: ' + (erro.erro || 'Erro'), 'erro');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão: ' + error.message, 'erro');
    }
};