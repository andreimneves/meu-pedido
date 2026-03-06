window.processarCheckout = async function() {
    if (carrinho.length === 0) return;

    // 1. DADOS DO CLIENTE E FORMULÁRIO
    const nome = document.getElementById('clienteNome').value.trim();
    const telefone = document.getElementById('clienteTelefone').value.trim();
    if (!nome || !telefone) {
        return Swal.fire('Atenção', 'Preencha o seu nome e telefone/WhatsApp.', 'warning');
    }

    const isDelivery = document.getElementById('deliveryOption').checked;
    
    if (isDelivery) {
        if (!dentroAreaEntrega && taxaFrete === 0) {
            return Swal.fire('Fora de Área', 'O seu endereço está fora da nossa área de entrega. Escolha "Retirar na Loja".', 'error');
        }
        const endereco = document.getElementById('clienteEndereco').value.trim();
        const bairro = document.getElementById('clienteBairro').value.trim();
        if (!endereco || !bairro) {
            return Swal.fire('Endereço', 'Preencha o endereço completo e o bairro.', 'warning');
        }
    }

    // 2. VERIFICAR AGENDAMENTO
    const isAgendado = document.getElementById('tempoAgendado').checked;
    const dataAgendadaInput = document.getElementById('dataAgendamento').value;
    
    if (isAgendado && !dataAgendadaInput) {
        return Swal.fire('Agendamento', 'Por favor, selecione a data e hora em que deseja receber.', 'warning');
    }

    // 3. A NOVA TRAVA DE HORÁRIO (Bloqueia pedidos imediatos se loja estiver fechada)
    const tipoParaValidar = isDelivery ? 'delivery' : 'loja';
    
    if (!isAgendado) { // Só bloqueia se a pessoa quer para AGORA
        try {
            Swal.fire({ title: 'A processar...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const resStatus = await fetch(`${API_URL}/horarios/status?tipo=${tipoParaValidar}`);
            const status = await resStatus.json();

            if (!status.aberto) {
                const msg = isDelivery 
                    ? "O nosso serviço de Delivery encontra-se fechado neste momento. Verifique os horários ou tente a Retirada na Loja, ou então faça um Agendamento."
                    : "A nossa Loja física encontra-se fechada neste momento. Por favor, consulte os nossos horários de funcionamento ou faça um Agendamento.";
                
                return Swal.fire({ icon: 'error', title: 'Estamos Fechados 😴', text: msg, confirmButtonColor: '#C83232' });
            }
        } catch (error) {
            console.error("Erro na checagem de horário:", error);
            // Continua se falhar a internet para não prender o cliente injustamente
        }
    }

    // 4. MANDA PARA O SERVIDOR E WHATSAPP
    try {
        if(isAgendado) Swal.fire({ title: 'A agendar...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const subtotal = carrinho.reduce((acc, item) => acc + item.precoTotalLinha, 0);
        const total = subtotal + taxaFrete;
        const formPagamento = document.getElementById('formaPagamento').options[document.getElementById('formaPagamento').selectedIndex].text;
        
        let textoObsFinal = `Pagamento: ${formPagamento}`;
        if (isAgendado) {
            const dateObj = new Date(dataAgendadaInput);
            textoObsFinal += ` | 🕒 AGENDADO PARA: ${dateObj.toLocaleString('pt-BR')}`;
        }

        const dadosPedido = {
            tenant_id: 1,
            subdominio: SUBDOMINIO,
            cliente_nome: nome,
            cliente_telefone: telefone,
            cliente_endereco: isDelivery ? document.getElementById('clienteEndereco').value : 'Retirada na Loja',
            cliente_bairro: isDelivery ? document.getElementById('clienteBairro').value : '',
            cliente_cep: isDelivery ? document.getElementById('cepInput').value : '',
            tipo_entrega: isDelivery ? 'delivery' : 'retirada',
            taxa_entrega: isDelivery ? taxaFrete : 0,
            subtotal: subtotal,
            total: total,
            status: 'novo',
            observacoes: textoObsFinal,
            itens: carrinho.map(item => ({
                produto_id: item.idProduto,
                produto_nome: item.nome,
                quantidade: item.quantidade,
                preco_unitario: item.precoUnitario,
                subtotal: item.precoTotalLinha,
                complementos: item.complementos.map(c => c.nome).join(', ') || null,
                observacao: item.observacao || null
            }))
        };

        const resEnvio = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedido)
        });

        if (!resEnvio.ok) throw new Error('Falha ao gravar pedido');
        const pedidoSalvo = await resEnvio.json();

        gerarLinkWhatsApp(dadosPedido, pedidoSalvo.id || 'N/A', isAgendado);

    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Ocorreu um erro ao enviar o pedido. Tente novamente.', 'error');
    }
}

// 5. MENSAGEM DE WHATSAPP (COM SUPORTE A AGENDAMENTO)
function gerarLinkWhatsApp(pedido, idPedido, isAgendado) {
    let msg = `*NOVO PEDIDO #${idPedido}*\n`;
    if (isAgendado) msg += `⏳ *AGENDAMENTO! Verifique as observações.*\n`;
    msg += `\n*Cliente:* ${pedido.cliente_nome}\n`;
    msg += `*Telefone:* ${pedido.cliente_telefone}\n\n`;
    msg += `*ITENS DO PEDIDO:*\n`;
    
    carrinho.forEach(i => {
        msg += `${i.quantidade}x ${i.nome} - R$ ${i.precoTotalLinha.toFixed(2)}\n`;
        if (i.complementos.length > 0) msg += `   + ${i.complementos.map(c=>c.nome).join(', ')}\n`;
        if (i.observacao) msg += `   Obs: ${i.observacao}\n`;
    });

    msg += `\n*Subtotal:* R$ ${pedido.subtotal.toFixed(2)}`;
    
    if (pedido.tipo_entrega === 'delivery') {
        msg += `\n*Taxa de Entrega:* R$ ${pedido.taxa_entrega.toFixed(2)}`;
        msg += `\n*Endereço:* ${pedido.cliente_endereco}, ${pedido.cliente_bairro}`;
    } else {
        msg += `\n*Tipo:* Retirada na Loja`;
    }

    msg += `\n*TOTAL: R$ ${pedido.total.toFixed(2)}*\n`;
    msg += `*Infos:* ${pedido.observacoes}\n`;

    let n = configuracoesLoja.whatsapp || '5551999999999';
    n = n.replace(/\D/g, '');
    if (!n.startsWith('55')) n = '55' + n;

    Swal.fire({
        icon: 'success',
        title: isAgendado ? 'Agendado com Sucesso!' : 'Pedido Enviado!',
        text: 'Você será redirecionado para o WhatsApp da loja para concluir.',
        showConfirmButton: false,
        timer: 2000
    }).then(() => {
        carrinho = [];
        document.getElementById('cartCount').textContent = '0';
        document.getElementById('rodapeCarrinho').style.display = 'none';
        fecharCarrinho();
        window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`, '_blank');
    });
}