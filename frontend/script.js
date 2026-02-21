let produtos = [];
let carrinho = [];
let categoriaAtiva = 'Todos';

// Carregar produtos da API
async function carregarProdutos() {
    try {
        const response = await fetch('http://localhost:3000/api/cardapio/dlcrepes');
        produtos = await response.json();
        exibirCategorias();
        exibirProdutos();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById('produtos').innerHTML = 
            '<div style="text-align: center; padding: 40px; color: red;">❌ Erro ao carregar cardápio</div>';
    }
}

function exibirCategorias() {
    const categorias = ['Todos', ...new Set(produtos.map(p => p.categoria_nome))];
    const html = categorias.map(cat => `
        <div class="categoria-tab ${cat === categoriaAtiva ? 'active' : ''}" 
             onclick="filtrarPorCategoria('${cat}')">
            ${cat}
        </div>
    `).join('');
    
    document.getElementById('categorias').innerHTML = html;
}

function filtrarPorCategoria(categoria) {
    categoriaAtiva = categoria;
    exibirCategorias();
    exibirProdutos();
}

function exibirProdutos() {
    const produtosFiltrados = categoriaAtiva === 'Todos' 
        ? produtos 
        : produtos.filter(p => p.categoria_nome === categoriaAtiva);
    
    const html = produtosFiltrados.map(p => `
        <div class="produto-card">
            <div class="produto-info">
                <h3>${p.nome}</h3>
                <div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div>
            </div>
            <button class="btn-adicionar" onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${p.preco})">
                Adicionar
            </button>
        </div>
    `).join('');
    
    document.getElementById('produtos').innerHTML = html;
}

function adicionarAoCarrinho(id, nome, preco) {
    carrinho.push({ id, nome, preco });
    atualizarCarrinho();
}

function atualizarCarrinho() {
    document.getElementById('cartCount').textContent = carrinho.length;
}

function abrirCarrinho() {
    const cartItems = document.getElementById('cartItems');
    const total = carrinho.reduce((sum, item) => sum + item.preco, 0);
    
    cartItems.innerHTML = carrinho.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span>${item.nome}</span>
            <span>R$ ${item.preco.toFixed(2)}</span>
        </div>
    `).join('');
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
    document.getElementById('cartModal').style.display = 'block';
}

function fecharCarrinho() {
    document.getElementById('cartModal').style.display = 'none';
}

function finalizarPedido() {
    if (carrinho.length === 0) {
        alert('Carrinho vazio!');
        return;
    }
    
    const total = carrinho.reduce((sum, item) => sum + item.preco, 0);
    const itens = carrinho.map(item => `• ${item.nome} - R$ ${item.preco.toFixed(2)}`).join('%0a');
    
    const mensagem = `Olá! Gostaria de fazer um pedido:%0a%0a${itens}%0a%0aTotal: R$ ${total.toFixed(2)}%0a%0a📍 Bairro Santa Marta`;
    
    window.open(`https://wa.me/55${telefoneLoja}?text=${mensagem}`, '_blank');
}

// Coloque o WhatsApp da DL Crepes aqui
const telefoneLoja = '55999999999';

// Iniciar
carregarProdutos();