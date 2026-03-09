// ==========================================
// CONFIGURAÇÕES GLOBAIS
// ==========================================
const API_URL = 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================
let produtos = [], gruposComplementosGlobal = [], itensComplementosGlobal = [], categorias = [], categoriaAtiva = 'Todos';
let carrinho = [], configuracoesLoja = {}, taxaFrete = 0, dentroAreaEntrega = false;
let produtoDetalheAtual = null, quantidadeDetalhe = 1, complementosSelecionados = {};
let coordsLoja = { lat: null, lng: null };
let modoAgendamento = false;
let horarioSelecionado = null;
let dataSelecionada = null;

// ==========================================
// INICIALIZAÇÃO
// ==========================================
window.onload = async () => {
    await carregarConfiguracoes();
    await carregarTudoDoBanco();
    atualizarStatusLoja();
    setInterval(atualizarStatusLoja, 30000);
};

// ==========================================
// UTILITÁRIOS
// ==========================================
function parseJSONSeguro(texto) {
    if (!texto) return {};
    if (typeof texto === 'object') return texto;
    try { return JSON.parse(texto) || {}; } catch (e) { return {}; }
}

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const notificacao = document.createElement('div');
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 50px;
        background: ${tipo === 'sucesso' ? '#4CAF50' : '#f44336'};
        color: white;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notificacao.textContent = mensagem;
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacao.remove(), 300);
    }, 3000);
}

// ==========================================
// CONFIGURAÇÕES DA LOJA
// ==========================================
async function carregarConfiguracoes() {
    try {
        const res = await fetch(`${API_URL}/config/${SUBDOMINIO}`);
        configuracoesLoja = await res.json();

        document.getElementById('nomeLoja').textContent = configuracoesLoja.nome_loja || 'Nossa Loja';
        document.getElementById('slogan').textContent = configuracoesLoja.slogan || '';
        document.getElementById('endereco').innerHTML = `📍 ${configuracoesLoja.endereco_completo || ''}`;
        
        if (configuracoesLoja.logo_url) {
            document.getElementById('logoImagem').src = configuracoesLoja.logo_url;
            document.getElementById('logoImagem').style.display = 'block';
            document.getElementById('logoPlaceholder').style.display = 'none';
        }

        const isMsgAtiva = String(configuracoesLoja.mensagem_banner_ativo) === 'true';
        const textoMsg = configuracoesLoja.mensagem_banner;

        if (isMsgAtiva && textoMsg && textoMsg.trim() !== '') {
            const msgDiv = document.getElementById('mensagemPersonalizada');
            if(msgDiv) {
                msgDiv.style.backgroundColor = configuracoesLoja.mensagem_banner_cor || '#FFF3E0';
                msgDiv.style.color = configuracoesLoja.mensagem_banner_texto || '#E65100';
                msgDiv.innerHTML = `<span style="font-size:16px;">${configuracoesLoja.mensagem_banner_icone || '📢'}</span> <span>${textoMsg}</span>`;
                msgDiv.style.display = 'flex';
            }
        }

        if (configuracoesLoja.cep_loja) {
            fetch(`https://cep.awesomeapi.com.br/json/${configuracoesLoja.cep_loja.replace(/\D/g, '')}`)
            .then(r => r.json()).then(d => { if(d.lat) coordsLoja = {lat: parseFloat(d.lat), lng: parseFloat(d.lng)}; }).catch(e=>{});
        }
    } catch (e) { console.error('Erro configs', e); }
}

// ==========================================
// ATUALIZAR STATUS DA LOJA
// ==========================================
async function atualizarStatusLoja() {
    try {
        const response = await fetch(`${API_URL}/status-loja/${SUBDOMINIO}`);
        const status = await response.json();
        
        const headerHorario = document.getElementById('horario');
        if (status.loja_aberta) {
            headerHorario.innerHTML = '🕒 <span style="color: #4CAF50;">● Aberto agora</span>';
        } else {
            headerHorario.innerHTML = `🕒 <span style="color: #f44336;">● Fechado • ${status.proximo_loja || 'Abre às 18:00'}</span>`;
        }
        
        return status;
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return null;
    }
}

// ==========================================
// BUSCAR HORÁRIOS DISPONÍVEIS PARA AGENDAMENTO
// ==========================================
async function buscarHorariosDisponiveis(tipo, data) {
    try {
        const response = await fetch(
            `${API_URL}/horarios-disponiveis/${SUBDOMINIO}/${tipo}?data=${data}`
        );
        
        if (!response.ok) {
            throw new Error('Erro ao buscar horários');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        return { disponivel: false, opcoes: [] };
    }
}

// ==========================================
// CARDÁPIO
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
        document.getElementById('produtos').innerHTML = `<div style="text-align:center; color:red;">Erro ao carregar cardápio.</div>`;
    }
}

window.abrirWhatsappSuporte = function() {
    let n = configuracoesLoja.whatsapp || '5551999999999';
    n = n.replace(/\D/g, '');
    if(!n.startsWith('55')) n='55'+n;
    window.open(`https://wa.me/${n}?text=Ol%C3%A1`, '_blank');
};

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

window.filtrarProdutos = function() {
    renderizarProdutos();
}

function renderizarProdutos() {
    const b = document.getElementById('searchInput').value.toLowerCase();
    const f = produtos.filter(p => (categoriaAtiva === 'Todos' || p.categoria_nome === categoriaAtiva) && p.nome.toLowerCase().includes(b));
    const div = document.getElementById('produtos');
    
    if (f.length === 0) return div.innerHTML = '<div style="text-align:center; color:#999; padding:30px;">Nenhum produto.</div>';
    
    div.innerHTML = f.map(p => `
        <div class="produto-card" onclick="abrirDetalheProduto(${p.id})">
            <div class="produto-info">
                <h3>${p.nome}</h3>
                <div class="produto-desc">${p.descricao || ''}</div>
                <div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div>
            </div>
            ${p.imagem_url ?
                `<img src="${p.imagem_url}" class="produto-imagem">` :
                `<div class="produto-imagem-placeholder">🍽️</div>`}
        </div>
    `).join('');
}

// ==========================================
// DETALHE DO PRODUTO (complementos)
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
    } else {
        imgCont.style.display = 'none';
    }
    
    document.getElementById('detalheComplementos').innerHTML = '<div style="text-align:center; padding:20px; color:#999;">Buscando opções...</div>';
    document.getElementById('produtoDetalheModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    try {
        const res = await fetch(`${API_URL}/complementos/produto/${id}`);
        renderizarGruposComplementos(res.ok ? await res.json() : []);
    } catch (e) {
        document.getElementById('detalheComplementos').innerHTML = '';
        atualizarTotalDetalhe();
    }
}

window.fecharDetalheProduto = function() {
    document.getElementById('produtoDetalheModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function renderizarGruposComplementos(gruposVinculados) {
    const c = document.getElementById('detalheComplementos');
    if(!Array.isArray(gruposVinculados) || gruposVinculados.length === 0) {
        c.innerHTML = '';
        atualizarTotalDetalhe();
        return;
    }
    
    let html = '';
    
    for (let v of gruposVinculados) {
        const g = gruposComplementosGlobal.find(x => x.id == v.id);
        if(!g) continue;
        
        complementosSelecionados[g.id] = [];
        let itens = [];
        
        try {
            const r = await fetch(`${API_URL}/grupo-complementos/${g.id}/itens`);
            if(r.ok) itens = await r.json();
        } catch(e){}
        
        if(itens.length === 0) continue;
        
        let rTxt = g.obrigatorio ? 'OBRIGATÓRIO' : 'OPCIONAL';
        let rCls = g.obrigatorio ? 'badge-obrig' : 'badge-opc';
        let lTxt = g.limite_selecao > 1 ? `Escolha até ${g.limite_selecao} opções` : `Escolha 1 opção`;
        
        html += `<div class="grupo-comp" id="grupo_${g.id}">
            <div class="grupo-comp-header">
                <div>
                    <div class="grupo-comp-titulo">${g.nome}</div>
                    <div class="grupo-comp-desc">${lTxt}</div>
                </div>
                <span class="${rCls}" id="badge_${g.id}">${rTxt}</span>
            </div>`;
        
        itens.forEach(i => {
            if(i.disponivel===false) return;
            
            let pf = parseFloat(i.preco)>0 ? `+ R$ ${parseFloat(i.preco).toFixed(2)}` : '';
            let rad = g.limite_selecao===1 ? 'radio-mark' : '';
            
            html += `<label class="item-comp checkbox-container">
                <div class="item-comp-info">
                    <div class="item-comp-nome">${i.nome}</div>
                    <div class="item-comp-preco">${pf}</div>
                </div>
                <input type="checkbox" class="cb-item" data-grupo="${g.id}" data-item-id="${i.id}" data-item-nome="${i.nome}" data-item-preco="${i.preco}" onchange="toggleComplemento(${g.id}, this)">
                <span class="checkmark ${rad}"></span>
            </label>`;
        });
        
        html += `</div>`;
    }
    
    c.innerHTML = html;
    atualizarTotalDetalhe();
}

window.toggleComplemento = function(gId, cb) {
    const gInfo = gruposComplementosGlobal.find(g => g.id == gId);
    let sel = complementosSelecionados[gId];
    
    if (cb.checked) {
        if(sel.length >= gInfo.limite_selecao) {
            if(gInfo.limite_selecao===1) {
                let idVelho = sel[0].id;
                document.querySelector(`input[data-item-id="${idVelho}"][data-grupo="${gId}"]`).checked = false;
                sel = [];
            } else {
                cb.checked = false;
                alert(`Limite de ${gInfo.limite_selecao}`);
                return;
            }
        }
        
        sel.push({
            id: cb.getAttribute('data-item-id'),
            nome: cb.getAttribute('data-item-nome'),
            preco: parseFloat(cb.getAttribute('data-item-preco'))
        });
    } else {
        sel = sel.filter(i => i.id !== cb.getAttribute('data-item-id'));
    }
    
    complementosSelecionados[gId] = sel;
    
    if (gInfo.obrigatorio) {
        const bdg = document.getElementById(`badge_${gId}`);
        if(sel.length>0){
            bdg.className='badge-opc';
            bdg.textContent='OK';
            bdg.style.background='#4CAF50';
        } else {
            bdg.className='badge-obrig';
            bdg.textContent='OBRIGATÓRIO';
            bdg.style.background='#333';
        }
    }
    
    atualizarTotalDetalhe();
}

window.alterarQuantidadeDetalhe = function(d) {
    quantidadeDetalhe += d;
    if(quantidadeDetalhe < 1) quantidadeDetalhe = 1;
    document.getElementById('detalheQuantidade').textContent = quantidadeDetalhe;
    atualizarTotalDetalhe();
}

function atualizarTotalDetalhe() {
    let sub = parseFloat(produtoDetalheAtual.preco);
    for(let g in complementosSelecionados) {
        complementosSelecionados[g].forEach(i => sub += i.preco);
    }
    
    document.getElementById('detalhePrecoTotal').textContent = (sub * quantidadeDetalhe).toFixed(2);
    
    let tudoCerto = true;
    for(let g in complementosSelecionados) {
        let gI = gruposComplementosGlobal.find(x => x.id == g);
        if(gI && gI.obrigatorio && complementosSelecionados[g].length === 0) tudoCerto = false;
    }
    
    const btn = document.querySelector('.btn-adicionar-final');
    btn.disabled = !tudoCerto;
    btn.style.opacity = tudoCerto ? '1' : '0.5';
}

window.adicionarProdutoPersonalizadoAoCarrinho = function() {
    let lComps = [];
    let pComps = 0;
    for (let g in complementosSelecionados) {
        complementosSelecionados[g].forEach(i => {
            lComps.push({nome:i.nome, preco:i.preco});
            pComps += i.preco;
        });
    }
    
    const obs = document.getElementById('detalheObservacao').value.trim();
    const pUnit = parseFloat(produtoDetalheAtual.preco) + pComps;
    
    const idx = carrinho.findIndex(i =>
        i.idProduto === produtoDetalheAtual.id &&
        i.observacao === obs &&
        JSON.stringify(i.complementos) === JSON.stringify(lComps)
    );
    
    if (idx !== -1) {
        carrinho[idx].quantidade += quantidadeDetalhe;
        carrinho[idx].precoTotalLinha = carrinho[idx].quantidade * carrinho[idx].precoUnitario;
    } else {
        carrinho.push({
            idProduto: produtoDetalheAtual.id,
            nome: produtoDetalheAtual.nome,
            quantidade: quantidadeDetalhe,
            precoUnitario: pUnit,
            precoTotalLinha: pUnit * quantidadeDetalhe,
            complementos: lComps,
            observacao: obs
        });
    }
    
    fecharDetalheProduto();
    atualizarRodapeCarrinho();
}

// ==========================================
// CARRINHO
// ==========================================
function atualizarRodapeCarrinho() {
    const rodape = document.getElementById('rodapeCarrinho');
    if (carrinho.length > 0) {
        document.getElementById('rodapeQtd').textContent = carrinho.reduce((s,i) => s + i.quantidade, 0);
        document.getElementById('rodapeTotal').textContent = carrinho.reduce((s,i) => s + i.precoTotalLinha, 0).toFixed(2);
        document.getElementById('cartCount').textContent = carrinho.reduce((s,i) => s + i.quantidade, 0);
        rodape.style.display = 'flex';
    } else {
        rodape.style.display = 'none';
        document.getElementById('cartCount').textContent = '0';
        fecharCarrinho();
    }
}

window.abrirCarrinho = function() {
    if(carrinho.length === 0) return alert('Seu carrinho está vazio.');
    
    document.getElementById('cartItems').innerHTML = carrinho.map((i, idx) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${i.quantidade}x ${i.nome}</h4>
                ${i.complementos.length > 0 ? `<div class="cart-item-comps">+ ${i.complementos.map(c => c.nome).join(', ')}</div>` : ''}
                ${i.observacao ? `<div class="cart-item-comps" style="color:#C83232">Obs: ${i.observacao}</div>` : ''}
                <div class="cart-item-price">R$ ${i.precoTotalLinha.toFixed(2)}</div>
            </div>
            <button class="cart-item-remove" onclick="removerDoCarrinho(${idx})">Remover</button>
        </div>
    `).join('');
    
    toggleDelivery(document.getElementById('deliveryOption').checked);
    
    document.getElementById('cartModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

window.fecharCarrinho = function() {
    document.getElementById('cartModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.removerDoCarrinho = function(idx) {
    carrinho.splice(idx, 1);
    atualizarRodapeCarrinho();
    if(carrinho.length > 0) abrirCarrinho();
}

// ==========================================
// TOGGLE DELIVERY - VERSÃO CORRIGIDA
// ==========================================
window.toggleDelivery = async function(isDelivery) {
    if (isDelivery === undefined) isDelivery = document.getElementById('deliveryOption').checked;
    
    document.getElementById('deliveryFields').style.display = isDelivery ? 'block' : 'none';
    document.getElementById('pickupFields').style.display = isDelivery ? 'none' : 'block';
    
    document.getElementById('agendamentoFields').style.display = 'none';
    let avisoDiv = document.getElementById('avisoDelivery');
    
    modoAgendamento = false;
    horarioSelecionado = null;
    
    // Reset do botão de finalizar
    const btn = document.querySelector('.whatsapp-btn');
    btn.disabled = true;
    btn.innerHTML = '📅 Selecione um horário';
    
    // Buscar status atualizado
    const status = await fetch(`${API_URL}/status-loja/${SUBDOMINIO}`).then(r => r.json());
    
    let disponivel = isDelivery ? status.delivery_aberto : status.loja_aberta;
    let mensagem = isDelivery ? status.mensagem_delivery : status.mensagem_loja;
    let proximo = isDelivery ? status.proximo_delivery : status.proximo_loja;
    
    if (disponivel) {
        btn.disabled = false;
        btn.innerHTML = '📲 Enviar Pedido via WhatsApp';
        avisoDiv.style.display = 'none';
    } else {
        btn.disabled = true;
        btn.innerHTML = '📅 Agendar Pedido';
        
        avisoDiv.innerHTML = `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="font-weight: bold; margin-bottom: 8px;">⏰ Fora do horário de funcionamento</p>
                <p style="margin-bottom: 8px;">${mensagem}</p>
                <p style="margin-bottom: 15px; color: #856404;">Próximo horário: ${proximo}</p>
                <button style="background: #C83232; color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; font-weight: bold; cursor: pointer;" onclick="mostrarAgendamento()">
                    📅 Agendar ${isDelivery ? 'Entrega' : 'Retirada'}
                </button>
                ${isDelivery ? `
                    <button style="background: #4CAF50; color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; font-weight: bold; cursor: pointer; margin-top: 8px;" onclick="toggleDelivery(false)">
                        🏪 Retirar na Loja
                    </button>
                ` : ''}
            </div>
        `;
        avisoDiv.style.display = 'block';
    }
    
    if (isDelivery) {
        document.getElementById('freteInfo').innerHTML = '👆 Informe seu CEP.';
        document.getElementById('freteInfo').className = 'frete-info';
        taxaFrete = 0;
        dentroAreaEntrega = false;
    } else {
        taxaFrete = 0;
        dentroAreaEntrega = false;
        document.getElementById('cepInfo').innerHTML = '';
    }
    
    calcularSubtotalGeral();
}

// ==========================================
// AGENDAMENTO - VERSÃO CORRIGIDA
// ==========================================
window.mostrarAgendamento = function() {
    document.getElementById('avisoDelivery').style.display = 'none';
    document.getElementById('agendamentoFields').style.display = 'block';
    modoAgendamento = true;
    
    const hoje = new Date();
    const dataMin = hoje.toISOString().split('T')[0];
    document.getElementById('dataAgendamento').min = dataMin;
    document.getElementById('dataAgendamento').value = '';
    document.getElementById('horarioAgendamento').innerHTML = '<option value="">Selecione uma data</option>';
    
    // Resetar botão
    const btn = document.querySelector('.whatsapp-btn');
    btn.disabled = true;
    btn.innerHTML = '📅 Selecione data e horário';
}

window.carregarHorariosPorData = async function() {
    const dataSelecionada = document.getElementById('dataAgendamento').value;
    const select = document.getElementById('horarioAgendamento');
    const tipo = document.querySelector('input[name="deliveryType"]:checked').value;
    const btn = document.querySelector('.whatsapp-btn');
    
    if (!dataSelecionada) {
        select.innerHTML = '<option value="">Selecione uma data</option>';
        btn.disabled = true;
        btn.innerHTML = '📅 Selecione uma data';
        return;
    }
    
    dataSelecionadaGlobal = dataSelecionada;
    select.innerHTML = '<option value="">🔄 Carregando...</option>';
    
    try {
        const horarios = await buscarHorariosDisponiveis(tipo, dataSelecionada);
        
        if (!horarios.disponivel || !horarios.opcoes || horarios.opcoes.length === 0) {
            select.innerHTML = '<option value="">❌ Sem horários disponíveis</option>';
            btn.disabled = true;
            btn.innerHTML = '📅 Indisponível';
            return;
        }
        
        let options = '<option value="">Selecione o horário</option>';
        
        horarios.opcoes.forEach(h => {
            options += `<option value="${h.valor}">${h.texto}</option>`;
        });
        
        select.innerHTML = options;
        
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        select.innerHTML = '<option value="">❌ Erro ao carregar</option>';
        btn.disabled = true;
        btn.innerHTML = '📅 Erro';
    }
}

// Nova função para quando selecionar um horário
window.selecionarHorario = function() {
    const select = document.getElementById('horarioAgendamento');
    const btn = document.querySelector('.whatsapp-btn');
    const data = document.getElementById('dataAgendamento').value;
    const horario = select.value;
    
    if (data && horario) {
        horarioSelecionado = horario;
        btn.disabled = false;
        btn.innerHTML = '📅 Confirmar Agendamento';
    } else {
        btn.disabled = true;
        btn.innerHTML = '📅 Selecione data e horário';
    }
}

// Adicionar evento ao select de horário
document.addEventListener('DOMContentLoaded', function() {
    const horarioSelect = document.getElementById('horarioAgendamento');
    if (horarioSelect) {
        horarioSelect.addEventListener('change', window.selecionarHorario);
    }
});

// ==========================================
// CEP E FRETE
// ==========================================
function calcularDistanciaGeo(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

window.mascaraCEP = function(i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length > 5) v = v.substring(0,5) + '-' + v.substring(5,8);
    i.value = v;
}

window.calcularFretePorCEP = async function() {
    const cepInput = document.getElementById('cepInput').value;
    const cepCliente = cepInput.replace(/\D/g, '');
    
    if(cepCliente.length !== 8) {
        document.getElementById('cepInfo').innerHTML = '❌ CEP Inválido';
        return;
    }
    
    document.getElementById('cepInfo').innerHTML = '🔄 Calculando...';
    
    try {
        const resCli = await fetch(`https://viacep.com.br/ws/${cepCliente}/json/`);
        const dadosCli = await resCli.json();
        
        if(dadosCli.erro) throw new Error('CEP não encontrado');
        
        document.getElementById('clienteEndereco').value = dadosCli.logradouro || '';
        document.getElementById('clienteBairro').value = dadosCli.bairro || '';
        
        if (!coordsLoja.lat && configuracoesLoja.cep_loja) {
            const resLoja = await fetch(`https://cep.awesomeapi.com.br/json/${configuracoesLoja.cep_loja.replace(/\D/g, '')}`);
            const dadosLoja = await resLoja.json();
            if(dadosLoja.lat) coordsLoja = {lat: parseFloat(dadosLoja.lat), lng: parseFloat(dadosLoja.lng)};
        }
        
        const resCliCoords = await fetch(`https://cep.awesomeapi.com.br/json/${cepCliente}`);
        const dadosCliCoords = await resCliCoords.json();
        
        if (coordsLoja.lat && coordsLoja.lng && dadosCliCoords.lat) {
            const kmReal = calcularDistanciaGeo(
                coordsLoja.lat, coordsLoja.lng,
                parseFloat(dadosCliCoords.lat), parseFloat(dadosCliCoords.lng)
            );
            
            const kmMax = parseFloat(configuracoesLoja.km_maximo_entrega) || 15;
            
            if (kmReal > kmMax) {
                document.getElementById('cepInfo').innerHTML = `📍 Distância: ${kmReal.toFixed(1)} km`;
                document.getElementById('freteInfo').innerHTML = `Fora da área de entrega (Máx: ${kmMax}km). Escolha Retirada.`;
                document.getElementById('freteInfo').className = 'frete-info erro';
                dentroAreaEntrega = false;
                taxaFrete = 0;
                calcularSubtotalGeral();
                return;
            }
            
            document.getElementById('cepInfo').innerHTML = `📍 Aprovado (${kmReal.toFixed(1)} km)`;
            
            let tMin = parseFloat(configuracoesLoja.taxa_minima) || 0;
            let tKm = parseFloat(configuracoesLoja.taxa_por_km) || 0;
            taxaFrete = tMin + (kmReal * tKm);
            if (taxaFrete < tMin) taxaFrete = tMin;
            
        } else {
            document.getElementById('cepInfo').innerHTML = `✅ Endereço Encontrado`;
            taxaFrete = parseFloat(configuracoesLoja.taxa_minima) || 0;
        }
        
        dentroAreaEntrega = true;
        
        const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0);
        const freeAtivo = String(configuracoesLoja.frete_gratis_ativo) === 'true' || configuracoesLoja.frete_gratis_ativo === true;
        const freeAcima = parseFloat(configuracoesLoja.frete_gratis_acima) || 0;
        
        if (freeAtivo && freeAcima > 0 && sub >= freeAcima) {
            taxaFrete = 0;
            document.getElementById('freteInfo').innerHTML = '🎉 Parabéns! O Frete é Grátis!';
            document.getElementById('freteInfo').className = 'frete-info';
            document.getElementById('freteInfo').style.background = '#4CAF50';
            document.getElementById('freteInfo').style.color = 'white';
        } else {
            document.getElementById('freteInfo').innerHTML = `🚚 Taxa de Entrega: R$ ${taxaFrete.toFixed(2)}`;
            document.getElementById('freteInfo').className = 'frete-info';
            document.getElementById('freteInfo').style.background = '#e8f5e9';
            document.getElementById('freteInfo').style.color = '#333';
        }
        
        calcularSubtotalGeral();
        
    } catch(e) {
        document.getElementById('cepInfo').innerHTML = '❌ Erro de busca. Preencha manualmente.';
        dentroAreaEntrega = true;
        taxaFrete = parseFloat(configuracoesLoja.taxa_minima) || 0;
        calcularSubtotalGeral();
    }
}

function calcularSubtotalGeral() {
    const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0);
    document.getElementById('cartSubtotal').textContent = sub.toFixed(2);
    document.getElementById('cartTotalFinal').textContent = (sub + (document.getElementById('deliveryOption').checked ? taxaFrete : 0)).toFixed(2);
}

// ==========================================
// FINALIZAR PEDIDO (COM AGENDAMENTO)
// ==========================================
window.finalizarPedido = async function() {
    const tipo = document.querySelector('input[name="deliveryType"]:checked').value;
    let nome, tel;
    let strAgendamento = "";
    
    // Verificar se é agendamento
    if (modoAgendamento) {
        const dataAgendamento = document.getElementById('dataAgendamento')?.value;
        const horarioAgendamento = document.getElementById('horarioAgendamento')?.value;
        
        if (!dataAgendamento || !horarioAgendamento) {
            alert('⚠️ Selecione a Data e o Horário para o agendamento!');
            return;
        }
        
        const dataFormatada = new Date(dataAgendamento + 'T12:00:00').toLocaleDateString('pt-BR');
        strAgendamento = `📅 Agendado para: ${dataFormatada} às ${horarioAgendamento}`;
    }
    
    // Validar campos
    if(tipo === 'delivery') {
        nome = document.getElementById('clienteNome').value.trim();
        tel = document.getElementById('clienteTelefone').value.trim();
        
        if(!nome || !tel || !document.getElementById('clienteEndereco').value || !document.getElementById('clienteNumero').value) {
            return alert('Preencha todos os dados de entrega!');
        }
        
        if(!dentroAreaEntrega && !modoAgendamento) {
            return alert('Desculpe, este endereço está fora da área de entrega calculada.');
        }
    } else {
        nome = document.getElementById('pickupNome').value.trim();
        tel = document.getElementById('pickupTelefone').value.trim();
        
        if(!nome || !tel) {
            return alert('Preencha seu nome e WhatsApp!');
        }
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
        observacoes: strAgendamento ? `[AGENDADO] ${strAgendamento}` : '',
        itens: carrinho.map(i => {
            let n = i.nome;
            if(i.complementos.length > 0) n += ' (+ ' + i.complementos.map(c => c.nome).join(', ') + ')';
            if(i.observacao) n += ` [Obs: ${i.observacao}]`;
            
            return {
                produto_id: i.idProduto,
                produto_nome: n,
                quantidade: i.quantidade,
                preco_unitario: i.precoUnitario,
                subtotal: i.precoTotalLinha
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
        if(dbData && dbData.pedido_id) idPedidoReal = ` #${dbData.pedido_id}`;
        
    } catch(e) {
        console.error('Erro ao salvar pedido:', e);
    }
    
    let msg = `🍽️ *NOVO PEDIDO${idPedidoReal}*\n━━━━━━━━━━━━━━━━\n`;
    if(strAgendamento) msg += `*${strAgendamento}*\n━━━━━━━━━━━━━━━━\n`;
    
    msg += `👤 *Cliente:* ${nome}\n📱 *Tel:* ${tel}\n\n🛍️ *RESUMO:*\n\n`;
    
    carrinho.forEach(i => {
        msg += `*${i.quantidade}x ${i.nome}* (R$ ${i.precoTotalLinha.toFixed(2)})\n`;
        i.complementos.forEach(c => {
            msg += `  ▫️ ${c.nome}${parseFloat(c.preco)>0 ? ` (+R$ ${parseFloat(c.preco).toFixed(2)})` : ''}\n`;
        });
        if(i.observacao) msg += `  💬 *Obs:* ${i.observacao}\n`;
        msg += `\n`;
    });
    
    msg += `━━━━━━━━━━━━━━━━\n💵 Subtotal: R$ ${sub.toFixed(2)}\n`;
    
    if(tipo === 'delivery') {
        msg += `🚚 Frete: ${taxaFrete > 0 ? 'R$ '+taxaFrete.toFixed(2) : '*GRÁTIS*'}\n`;
        msg += `📍 *ENTREGA EM:*\n${dadosPedido.cliente_endereco}\n${dadosPedido.cliente_bairro} - CEP: ${dadosPedido.cliente_cep}\n`;
    } else {
        msg += `🏠 *RETIRADA NA LOJA*\n`;
    }
    
    msg += `\n💰 *TOTAL A PAGAR: R$ ${totalFinal.toFixed(2)}*`;
    
    carrinho = [];
    atualizarRodapeCarrinho();
    
    btn.innerHTML = '📲 Enviar Pedido via WhatsApp';
    btn.disabled = false;
    fecharCarrinho();
    
    let nw = configuracoesLoja.whatsapp || '5551999999999';
    nw = nw.replace(/\D/g, '');
    if(!nw.startsWith('55')) nw = '55' + nw;
    
    window.open(`https://wa.me/${nw}?text=${encodeURIComponent(msg)}`, '_blank');
}