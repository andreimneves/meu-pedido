// frontend/script.js - DEFINITIVO E BLINDADO

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:10000/api'
    : 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

// Estado global
let produtos = [];
let gruposComplementosGlobal = [];
let itensComplementosGlobal = [];
let categorias = [];
let categoriaAtiva = 'Todos';

let carrinho = [];
let configuracoesLoja = {};
let taxaFrete = 0;
let dentroAreaEntrega = false;

// Estado do Modal de Detalhe
let produtoDetalheAtual = null;
let quantidadeDetalhe = 1;
let complementosSelecionados = {}; 

window.onload = async () => {
    await carregarConfiguracoes();
    await carregarTudoDoBanco(); 
};

// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
async function carregarTudoDoBanco() {
    try {
        const [resProd, resGrupos, resItens] = await Promise.all([
            fetch(`${API_URL}/cardapio/${SUBDOMINIO}`),
            fetch(`${API_URL}/grupos-complementos?tenant_id=1`),
            fetch(`${API_URL}/complementos?tenant_id=1`)
        ]);

        produtos = await resProd.json();
        gruposComplementosGlobal = resGrupos.ok ? await resGrupos.json() : [];
        itensComplementosGlobal = resItens.ok ? await resItens.json() : [];

        categorias = ['Todos', ...new Set(produtos.map(p => p.categoria_nome).filter(Boolean))];
        
        renderizarCategorias();
        renderizarProdutos();
        
    } catch (e) {
        document.getElementById('produtos').innerHTML = `<div style="text-align:center; padding:30px; color:red;">Erro ao carregar cardápio. Atualize a página.</div>`;
    }
}

async function carregarConfiguracoes() {
    try {
        const response = await fetch(`${API_URL}/config/${SUBDOMINIO}`);
        configuracoesLoja = await response.json();
        
        document.getElementById('nomeLoja').textContent = configuracoesLoja.nome_loja || 'Nossa Loja';
        document.getElementById('slogan').textContent = configuracoesLoja.slogan || '';
        document.getElementById('horario').innerHTML = `🕒 ${configuracoesLoja.horario_funcionamento || 'Consulte os horários'}`;
        document.getElementById('endereco').innerHTML = `📍 ${configuracoesLoja.endereco_completo || ''}`;
        
        if (configuracoesLoja.logo_url) {
            document.getElementById('logoImagem').src = configuracoesLoja.logo_url;
            document.getElementById('logoImagem').style.display = 'block';
            document.getElementById('logoPlaceholder').style.display = 'none';
        }

        // MÁGICA DA MENSAGEM: Lê qualquer variação que o banco envie
        const msgDiv = document.getElementById('mensagemPersonalizada');
        const textoMsg = configuracoesLoja.mensagem_personalizada || configuracoesLoja.mensagem_texto || configuracoesLoja.mensagem || '';
        
        // Verifica ativação forçando conversão para texto
        const statusAtivo = String(configuracoesLoja.mensagem_ativa).toLowerCase();
        const msgAtiva = (statusAtivo === 'true' || statusAtivo === '1' || statusAtivo === 'sim');

        if (msgAtiva && textoMsg.trim() !== '') {
            msgDiv.innerHTML = textoMsg;
            msgDiv.style.display = 'block';
        } else {
            msgDiv.style.display = 'none';
        }

    } catch (e) { console.log('Erro configs', e); }
}

window.abrirWhatsappSuporte = function() {
    let numero = configuracoesLoja.whatsapp || '5551999999999';
    numero = numero.replace(/\D/g, ''); 
    if (!numero.startsWith('55')) numero = '55' + numero; 
    
    const texto = encodeURIComponent('Olá! Preciso de ajuda com o cardápio/pedido.');
    window.open(`https://wa.me/${numero}?text=${texto}`, '_blank');
};

// ==========================================
// 2. RENDERIZAÇÃO DA VITRINE
// ==========================================
function renderizarCategorias() {
    document.getElementById('categorias').innerHTML = categorias.map(c => 
        `<button class="categoria-btn ${c === categoriaAtiva ? 'ativa' : ''}" onclick="filtrarCategoria('${c}')">${c}</button>`
    ).join('');
}

window.filtrarCategoria = function(cat) {
    categoriaAtiva = cat;
    renderizarCategorias();
    renderizarProdutos();
}

window.filtrarProdutos = function() { renderizarProdutos(); }

function renderizarProdutos() {
    const busca = document.getElementById('searchInput').value.toLowerCase();
    const filtrados = produtos.filter(p => 
        (categoriaAtiva === 'Todos' || p.categoria_nome === categoriaAtiva) &&
        p.nome.toLowerCase().includes(busca)
    );

    const div = document.getElementById('produtos');
    if (filtrados.length === 0) {
        div.innerHTML = '<div style="text-align:center; padding:30px; color:#999;">Nenhum produto encontrado.</div>';
        return;
    }

    div.innerHTML = filtrados.map(p => `
        <div class="produto-card" onclick="abrirDetalheProduto(${p.id})">
            <div class="produto-info">
                <h3>${p.nome}</h3>
                <div class="produto-desc">${p.descricao || ''}</div>
                <div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div>
            </div>
            ${p.imagem_url 
                ? `<img src="${p.imagem_url}" class="produto-imagem">` 
                : `<div class="produto-imagem-placeholder">🍽️</div>`
            }
        </div>
    `).join('');
}

// ==========================================
// 3. LÓGICA DO MODAL DE DETALHES E COMPLEMENTOS
// ==========================================
window.abrirDetalheProduto = async function(id) {
    produtoDetalheAtual = produtos.find(p => p.id == id);
    quantidadeDetalhe = 1;
    complementosSelecionados = {}; 
    
    document.getElementById('detalheNome').textContent = produtoDetalheAtual.nome;
    document.getElementById('detalheDescricao').textContent = produtoDetalheAtual.descricao || '';
    document.getElementById('detalhePrecoBase').textContent = parseFloat(produtoDetalheAtual.preco).toFixed(2);
    document.getElementById('detalheQuantidade').textContent = quantidadeDetalhe;
    document.getElementById('detalheObservacao').value = '';
    
    const imgCont = document.getElementById('detalheImagemContainer');
    if(produtoDetalheAtual.imagem_url) {
        document.getElementById('detalheImagem').src = produtoDetalheAtual.imagem_url;
        imgCont.style.display = 'block';
    } else { imgCont.style.display = 'none'; }

    document.getElementById('detalheComplementos').innerHTML = '<div class="loading">Buscando opções...</div>';
    document.getElementById('produtoDetalheModal').style.display = 'block';
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`${API_URL}/complementos/produto/${id}`);
        let gruposVinculados = [];
        if (res.ok) {
            const dados = await res.json();
            if (Array.isArray(dados)) gruposVinculados = dados;
        }
        // CORREÇÃO: Renderiza os complementos encontrados no banco para este produto
        renderizarGruposComplementos(gruposVinculados);
    } catch (e) {
        document.getElementById('detalheComplementos').innerHTML = '<div style="color:red; padding:20px;">Erro ao carregar adicionais.</div>';
        atualizarTotalDetalhe();
    }
}

window.fecharDetalheProduto = function() {
    document.getElementById('produtoDetalheModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function renderizarGruposComplementos(gruposVinculados) {
    const container = document.getElementById('detalheComplementos');
    
    if (gruposVinculados.length === 0) {
        container.innerHTML = ''; 
        atualizarTotalDetalhe();
        return;
    }

    let html = '';
    
    for (let vinculo of gruposVinculados) {
        // CORREÇÃO: Uso de "==" para não falhar se o id for texto ou número
        const grupoCompleto = gruposComplementosGlobal.find(g => g.id == vinculo.id);
        if (!grupoCompleto) continue;

        complementosSelecionados[grupoCompleto.id] = [];
        let itensDoGrupo = [];
        try {
            const resItens = await fetch(`${API_URL}/grupo-complementos/${grupoCompleto.id}/itens`);
            if (resItens.ok) itensDoGrupo = await resItens.json();
        } catch(e) {}

        if (itensDoGrupo.length === 0) continue; 

        let reqText = grupoCompleto.obrigatorio ? 'OBRIGATÓRIO' : 'OPCIONAL';
        let reqClass = grupoCompleto.obrigatorio ? 'badge-obrig' : 'badge-opc';
        let limitText = grupoCompleto.limite_selecao > 1 ? `Escolha até ${grupoCompleto.limite_selecao} opções` : `Escolha 1 opção`;

        html += `
            <div class="grupo-comp" id="grupo_${grupoCompleto.id}">
                <div class="grupo-comp-header">
                    <div>
                        <div class="grupo-comp-titulo">${grupoCompleto.nome}</div>
                        <div class="grupo-comp-desc">${limitText}</div>
                    </div>
                    <span class="${reqClass}" id="badge_${grupoCompleto.id}">${reqText}</span>
                </div>
        `;

        itensDoGrupo.forEach(item => {
            if(item.disponivel === false) return; 

            let precoFormatado = parseFloat(item.preco) > 0 ? `+ R$ ${parseFloat(item.preco).toFixed(2)}` : '';
            let isRadio = grupoCompleto.limite_selecao === 1 ? 'radio-mark' : '';
            
            html += `
                <label class="item-comp checkbox-container">
                    <div class="item-comp-info">
                        <div class="item-comp-nome">${item.nome}</div>
                        <div class="item-comp-preco">${precoFormatado}</div>
                    </div>
                    <input type="checkbox" class="cb-item" 
                        data-grupo="${grupoCompleto.id}" 
                        data-item-id="${item.id}" 
                        data-item-nome="${item.nome}" 
                        data-item-preco="${item.preco}"
                        onchange="toggleComplemento(${grupoCompleto.id}, this)">
                    <span class="checkmark ${isRadio}"></span>
                </label>
            `;
        });
        
        html += `</div>`;
    }

    container.innerHTML = html;
    atualizarTotalDetalhe();
}

window.toggleComplemento = function(grupoId, checkbox) {
    const grupoInfo = gruposComplementosGlobal.find(g => g.id == grupoId);
    const limite = grupoInfo.limite_selecao;
    let selecionados = complementosSelecionados[grupoId];

    if (checkbox.checked) {
        if (selecionados.length >= limite) {
            if (limite === 1) {
                const cbAntigoId = selecionados[0].id;
                document.querySelector(`input[data-item-id="${cbAntigoId}"][data-grupo="${grupoId}"]`).checked = false;
                selecionados = []; 
            } else {
                checkbox.checked = false;
                alert(`Você só pode escolher até ${limite} opções neste grupo.`);
                return;
            }
        }
        
        selecionados.push({
            id: checkbox.getAttribute('data-item-id'),
            nome: checkbox.getAttribute('data-item-nome'),
            preco: parseFloat(checkbox.getAttribute('data-item-preco'))
        });
    } else {
        const itemId = checkbox.getAttribute('data-item-id');
        selecionados = selecionados.filter(i => i.id !== itemId);
    }
    
    complementosSelecionados[grupoId] = selecionados;
    
    if (grupoInfo.obrigatorio) {
        const badge = document.getElementById(`badge_${grupoId}`);
        if (selecionados.length > 0) {
            badge.className = 'badge-opc';
            badge.textContent = 'OK';
            badge.style.background = '#4CAF50';
        } else {
            badge.className = 'badge-obrig';
            badge.textContent = 'OBRIGATÓRIO';
            badge.style.background = '#333';
        }
    }
    atualizarTotalDetalhe();
}

window.alterarQuantidadeDetalhe = function(delta) {
    quantidadeDetalhe += delta;
    if (quantidadeDetalhe < 1) quantidadeDetalhe = 1;
    document.getElementById('detalheQuantidade').textContent = quantidadeDetalhe;
    atualizarTotalDetalhe();
}

function atualizarTotalDetalhe() {
    let subtotal = parseFloat(produtoDetalheAtual.preco);
    for (let grupo in complementosSelecionados) {
        complementosSelecionados[grupo].forEach(item => { subtotal += item.preco; });
    }
    
    let totalCena = subtotal * quantidadeDetalhe;
    document.getElementById('detalhePrecoTotal').textContent = totalCena.toFixed(2);
    
    let tudoCerto = true;
    for (let grupo in complementosSelecionados) {
        const gInfo = gruposComplementosGlobal.find(g => g.id == grupo);
        if (gInfo && gInfo.obrigatorio && complementosSelecionados[grupo].length === 0) {
            tudoCerto = false;
        }
    }
    
    const btnAdd = document.querySelector('.btn-adicionar-final');
    if(tudoCerto) {
        btnAdd.disabled = false;
        btnAdd.style.opacity = '1';
    } else {
        btnAdd.disabled = true;
        btnAdd.style.opacity = '0.5';
    }
}

window.adicionarProdutoPersonalizadoAoCarrinho = function() {
    let listaComps = [];
    let precoComps = 0;
    
    for (let grupo in complementosSelecionados) {
        complementosSelecionados[grupo].forEach(item => {
            listaComps.push({ nome: item.nome, preco: item.preco });
            precoComps += item.preco;
        });
    }
    
    const obs = document.getElementById('detalheObservacao').value.trim();
    const precoBase = parseFloat(produtoDetalheAtual.preco);
    const precoUnitarioTotal = precoBase + precoComps;

    const indexExistente = carrinho.findIndex(i => 
        i.idProduto === produtoDetalheAtual.id &&
        i.observacao === obs &&
        JSON.stringify(i.complementos) === JSON.stringify(listaComps)
    );

    if (indexExistente !== -1) {
        carrinho[indexExistente].quantidade += quantidadeDetalhe;
        carrinho[indexExistente].precoTotalLinha = carrinho[indexExistente].quantidade * carrinho[indexExistente].precoUnitario;
    } else {
        carrinho.push({
            idProduto: produtoDetalheAtual.id,
            nome: produtoDetalheAtual.nome,
            quantidade: quantidadeDetalhe,
            precoBase: precoBase,
            precoUnitario: precoUnitarioTotal,
            precoTotalLinha: precoUnitarioTotal * quantidadeDetalhe,
            complementos: listaComps,
            observacao: obs
        });
    }

    fecharDetalheProduto();
    atualizarRodapeCarrinho();
    alert('✅ Adicionado ao carrinho!');
}

// ==========================================
// 4. GESTÃO DO CARRINHO
// ==========================================
function atualizarRodapeCarrinho() {
    const rodape = document.getElementById('rodapeCarrinho');
    if (carrinho.length > 0) {
        const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
        const valorTotal = carrinho.reduce((sum, item) => sum + item.precoTotalLinha, 0);
        
        document.getElementById('rodapeQtd').textContent = totalItens;
        document.getElementById('rodapeTotal').textContent = valorTotal.toFixed(2);
        document.getElementById('cartCount').textContent = totalItens;
        rodape.style.display = 'flex';
    } else {
        rodape.style.display = 'none';
        document.getElementById('cartCount').textContent = '0';
        fecharCarrinho();
    }
}

window.abrirCarrinho = function() {
    if(carrinho.length === 0) return alert('Seu carrinho está vazio!');
    
    const divItens = document.getElementById('cartItems');
    divItens.innerHTML = carrinho.map((item, index) => {
        let compText = item.complementos.map(c => `+ ${c.nome}`).join('<br>');
        let obsText = item.observacao ? `<br><em>Obs: ${item.observacao}</em>` : '';
        
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.quantidade}x ${item.nome}</h4>
                    ${compText ? `<div class="cart-item-comps">${compText}</div>` : ''}
                    ${obsText ? `<div class="cart-item-comps" style="color:#C83232;">${obsText}</div>` : ''}
                    <div class="cart-item-price">R$ ${item.precoTotalLinha.toFixed(2)}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="cart-item-remove" onclick="removerDoCarrinho(${index})">Remover</button>
                </div>
            </div>
        `;
    }).join('');

    calcularSubtotalGeral();
    document.getElementById('cartModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

window.fecharCarrinho = function() {
    document.getElementById('cartModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.removerDoCarrinho = function(index) {
    carrinho.splice(index, 1);
    atualizarRodapeCarrinho();
    if(carrinho.length > 0) abrirCarrinho();
}

function calcularSubtotalGeral() {
    const sub = carrinho.reduce((sum, i) => sum + i.precoTotalLinha, 0);
    document.getElementById('cartSubtotal').textContent = sub.toFixed(2);
    
    const isDelivery = document.getElementById('deliveryOption').checked;
    const final = sub + (isDelivery ? taxaFrete : 0);
    document.getElementById('cartTotalFinal').textContent = final.toFixed(2);
}

// ==========================================
// 5. CEP E FRETE (BLOQUEIO ESTREITO E SEGURO)
// ==========================================
window.toggleDelivery = function(isDelivery) {
    document.getElementById('deliveryFields').style.display = isDelivery ? 'block' : 'none';
    document.getElementById('pickupFields').style.display = isDelivery ? 'none' : 'block';
    if(isDelivery) { 
        document.getElementById('freteInfo').innerHTML = '👆 Informe seu CEP para calcular a taxa'; 
        document.getElementById('freteInfo').className = 'frete-info';
        taxaFrete = 0; 
    }
    else { 
        taxaFrete = 0; 
        dentroAreaEntrega = false; 
        document.getElementById('cepInfo').innerHTML=''; 
    }
    calcularSubtotalGeral();
}

window.mascaraCEP = function(i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length > 5) v = v.substring(0,5) + '-' + v.substring(5,8);
    i.value = v;
}

window.calcularFretePorCEP = async function() {
    const cepInput = document.getElementById('cepInput').value;
    const cep = cepInput.replace(/\D/g, '');
    
    if(cep.length !== 8) {
        document.getElementById('cepInfo').innerHTML = '❌ CEP Inválido (8 números)';
        return;
    }
    
    document.getElementById('cepInfo').innerHTML = '🔄 Buscando CEP...';
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await response.json();
        
        if(dados.erro) {
            document.getElementById('cepInfo').innerHTML = '❌ CEP não encontrado na base dos correios';
            return;
        }

        // --- BLINDAGEM TOTAL DE ÁREA DE ENTREGA ---
        let bloqueado = false;
        let motivoBloqueio = '';
        taxaFrete = 0;

        // Função interna para limpar acentos e espaços, evitando erros de digitação (ex: "São Paulo" vira "saopaulo")
        const normalizar = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
        const cidadeCep = normalizar(dados.localidade);
        const bairroCep = normalizar(dados.bairro);
        const cidadeConfig = normalizar(configuracoesLoja.cidade);

        // 1. Trava de Cidade (Se a loja preencheu uma cidade nas configurações)
        if (cidadeConfig && cidadeConfig !== '' && cidadeCep !== cidadeConfig) {
            bloqueado = true;
            motivoBloqueio = `Atendemos apenas a cidade de ${configuracoesLoja.cidade}.`;
        }

        // 2. Trava de Bairro (Se a loja preencheu bairros)
        if (!bloqueado) {
            let temRegraBairro = false;
            let taxaEncontrada = null;
            let bairroAtendido = false;

            // A) Tenta ler se o Admin salvou como lista complexa [{nome: 'Centro', taxa: 5}]
            let bairrosLista = [];
            if (typeof configuracoesLoja.bairros_entrega === 'string' && configuracoesLoja.bairros_entrega.startsWith('[')) {
                try { bairrosLista = JSON.parse(configuracoesLoja.bairros_entrega); } catch(e) {}
            } else if (Array.isArray(configuracoesLoja.bairros_entrega)) {
                bairrosLista = configuracoesLoja.bairros_entrega;
            }

            if (bairrosLista && bairrosLista.length > 0) {
                temRegraBairro = true;
                const bairroMatch = bairrosLista.find(b => normalizar(b.nome || b) === bairroCep);
                if (bairroMatch) {
                    bairroAtendido = true;
                    taxaEncontrada = parseFloat(bairroMatch.taxa || configuracoesLoja.taxa_minima) || 0;
                }
            } 
            // B) Tenta ler se o Admin salvou apenas como texto separado por vírgula ("Centro, Botafogo, Copacabana")
            else if (typeof configuracoesLoja.bairros_entrega === 'string' && configuracoesLoja.bairros_entrega.trim().length > 0) {
                temRegraBairro = true;
                const listaTextual = configuracoesLoja.bairros_entrega.split(',').map(normalizar);
                if (listaTextual.includes(bairroCep)) {
                    bairroAtendido = true;
                    taxaEncontrada = parseFloat(configuracoesLoja.taxa_minima) || 0;
                }
            }

            // Verifica o resultado da leitura de bairros
            if (temRegraBairro) {
                if (!bairroAtendido) {
                    bloqueado = true;
                    motivoBloqueio = `Ainda não entregamos no bairro ${dados.bairro}.`;
                } else {
                    taxaFrete = taxaEncontrada;
                }
            } else {
                // Se o lojista deixou o campo de bairros VAZIO, cobra a taxa geral para a cidade toda
                taxaFrete = parseFloat(configuracoesLoja.taxa_minima) || 0;
            }
        }

        // Executa o Bloqueio Final na Tela
        if (bloqueado) {
            document.getElementById('cepInfo').innerHTML = `❌ ${motivoBloqueio}`;
            document.getElementById('freteInfo').innerHTML = '⚠️ Fora da área de cobertura';
            document.getElementById('freteInfo').className = 'frete-info erro';
            dentroAreaEntrega = false;
            taxaFrete = 0;
            calcularSubtotalGeral();
            return;
        }
        
        // Se o código chegou aqui, o CEP foi APROVADO! 🎉
        document.getElementById('clienteEndereco').value = dados.logradouro || '';
        document.getElementById('clienteBairro').value = dados.bairro || '';
        document.getElementById('cepInfo').innerHTML = '✅ CEP Encontrado';
        dentroAreaEntrega = true;
        
        // Cálculo do Frete Grátis
        const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0);
        // Garante que entende "1", "true" ou true
        const isFreteGratisAtivo = configuracoesLoja.frete_gratis_ativo == 1 || configuracoesLoja.frete_gratis_ativo === 'true' || configuracoesLoja.frete_gratis_ativo === true;
        const freteGratisAcima = parseFloat(configuracoesLoja.frete_gratis_acima) || 0;

        if (isFreteGratisAtivo && freteGratisAcima > 0 && sub >= freteGratisAcima) {
            taxaFrete = 0; 
            document.getElementById('freteInfo').innerHTML = '🎉 Parabéns! Entrega Grátis!';
            document.getElementById('freteInfo').className = 'frete-info';
        } else {
            document.getElementById('freteInfo').innerHTML = taxaFrete > 0 ? `🚚 Taxa de Entrega: R$ ${taxaFrete.toFixed(2)}` : `🚚 Entrega Grátis!`;
            document.getElementById('freteInfo').className = 'frete-info';
        }
        
        calcularSubtotalGeral();
        
    } catch(e) {
        console.error("Erro ViaCEP:", e);
        document.getElementById('cepInfo').innerHTML = '❌ Falha de conexão. Tente novamente.';
    }
}

// ==========================================
// 6. FINALIZAR E GRAVAR NO BANCO
// ==========================================
window.finalizarPedido = async function() {
    const tipo = document.querySelector('input[name="deliveryType"]:checked').value;
    let nome, tel;
    
    if(tipo === 'delivery') {
        nome = document.getElementById('clienteNome').value.trim();
        tel = document.getElementById('clienteTelefone').value.trim();
        if(!nome || !tel || !document.getElementById('clienteEndereco').value || !document.getElementById('clienteNumero').value) {
            return alert('Por favor, preencha todos os dados de entrega obrigatórios!');
        }
        if(!dentroAreaEntrega) return alert('Desculpe, este endereço está fora da nossa área de cobertura ou o CEP não foi validado.');
    } else {
        nome = document.getElementById('pickupNome').value.trim();
        tel = document.getElementById('pickupTelefone').value.trim();
        if(!nome || !tel) return alert('Por favor, preencha o seu nome e WhatsApp!');
    }

    const btn = document.querySelector('.whatsapp-btn');
    btn.innerHTML = '⏳ Processando...';
    btn.disabled = true;

    const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0);
    const totalFinal = sub + (tipo === 'delivery' ? taxaFrete : 0);

    let dadosPedido = {
        cliente_nome: nome,
        cliente_telefone: tel,
        tipo_entrega: tipo,
        taxa_entrega: tipo === 'delivery' ? taxaFrete : 0,
        subtotal: sub,
        total: totalFinal,
        observacoes: '',
        itens: carrinho.map(item => {
            let nomeProdutoAdmin = item.nome;
            if (item.complementos && item.complementos.length > 0) {
                nomeProdutoAdmin += ' (+ ' + item.complementos.map(c => c.nome).join(', ') + ')';
            }
            if (item.observacao) {
                nomeProdutoAdmin += ` [Obs: ${item.observacao}]`;
            }

            return {
                produto_id: item.idProduto,
                produto_nome: nomeProdutoAdmin,
                quantidade: item.quantidade,
                preco_unitario: item.precoUnitario,
                subtotal: item.precoTotalLinha
            };
        })
    };

    if (tipo === 'delivery') {
        const comp = document.getElementById('clienteComplemento').value;
        dadosPedido.cliente_endereco = `${document.getElementById('clienteEndereco').value}, ${document.getElementById('clienteNumero').value}${comp ? ' - ' + comp : ''}`;
        dadosPedido.cliente_bairro = document.getElementById('clienteBairro').value;
        dadosPedido.cliente_cep = document.getElementById('cepInput').value;
    }

    let idPedidoReal = '';
    try {
        const res = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdominio: SUBDOMINIO, pedido: dadosPedido })
        });
        const dbData = await res.json();
        if(dbData && dbData.id) {
            idPedidoReal = ` #${dbData.id}`; 
        }
    } catch(e) { console.error('Falha ao salvar no painel:', e); }

    let msg = `🍽️ *NOVO PEDIDO${idPedidoReal}*\n━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Cliente:* ${nome}\n📱 *Tel:* ${tel}\n\n`;
    msg += `🛍️ *RESUMO DO PEDIDO:*\n\n`;

    carrinho.forEach(item => {
        msg += `*${item.quantidade}x ${item.nome}* (R$ ${item.precoTotalLinha.toFixed(2)})\n`;
        item.complementos.forEach(c => {
            msg += `  ▫️ ${c.nome}${parseFloat(c.preco) > 0 ? ` (+R$ ${parseFloat(c.preco).toFixed(2)})` : ''}\n`;
        });
        if (item.observacao) msg += `  💬 *Obs:* ${item.observacao}\n`;
        msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `💵 Subtotal: R$ ${sub.toFixed(2)}\n`;
    
    if(tipo === 'delivery') {
        msg += `🚚 Frete: ${taxaFrete > 0 ? 'R$ '+taxaFrete.toFixed(2) : '*GRÁTIS*'}\n`;
        msg += `📍 *ENTREGA EM:*\n`;
        msg += `${dadosPedido.cliente_endereco}\n`;
        msg += `${dadosPedido.cliente_bairro} - CEP: ${dadosPedido.cliente_cep}\n`;
    } else {
        msg += `🏠 *RETIRADA NO BALCÃO*\n`;
    }
    
    msg += `\n💰 *TOTAL A PAGAR: R$ ${totalFinal.toFixed(2)}*`;

    carrinho = [];
    atualizarRodapeCarrinho();
    
    btn.innerHTML = '📲 Enviar Pedido via WhatsApp';
    btn.disabled = false;

    let numeroWa = configuracoesLoja.whatsapp || '5551999999999';
    numeroWa = numeroWa.replace(/\D/g, '');
    if(!numeroWa.startsWith('55')) numeroWa = '55' + numeroWa;

    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(msg)}`, '_blank');
}