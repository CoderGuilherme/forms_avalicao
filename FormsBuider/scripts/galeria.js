// --- FUNÇÕES AUXILIARES PARA MODAIS CUSTOMIZADOS ---

/**
 * Exibe um modal de alerta customizado.
 * @param {string} message A mensagem a ser exibida.
 * @param {'info'|'success'|'warning'|'error'} type O tipo de alerta (define o ícone e cor). Padrão 'info'.
 */
function showCustomAlert(message, type = 'info') {
    // Remove qualquer modal existente para evitar sobreposição
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());

    let iconClass = 'fa-solid fa-circle-info'; // Padrão info
    let iconColorClass = 'icon-info';

    switch (type) {
        case 'success':
            iconClass = 'fa-solid fa-circle-check';
            iconColorClass = 'icon-success';
            break;
        case 'warning':
            iconClass = 'fa-solid fa-triangle-exclamation';
            iconColorClass = 'icon-warning';
            break;
        case 'error':
            iconClass = 'fa-solid fa-circle-xmark';
            iconColorClass = 'icon-error';
            break;
    }

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-box modal-${type}">
                <div class="modal-icon ${iconColorClass}">
                    <i class="${iconClass}"></i>
                </div>
                <p class="modal-message">${message}</p>
                <div class="modal-buttons">
                    <button class="modal-btn-primary modal-close">OK</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalOverlay = document.body.querySelector('.modal-overlay:last-of-type');
    const closeButton = modalOverlay.querySelector('.modal-close');

    // Força reflow para garantir que a transição funcione
    void modalOverlay.offsetWidth; 

    // Adiciona classe para ativar a animação
    modalOverlay.classList.add('active');

    const closeModal = () => {
        modalOverlay.classList.remove('active');
        // Remove o modal do DOM após a animação de fade-out
        modalOverlay.addEventListener('transitionend', () => {
             if (modalOverlay.parentNode) {
                 modalOverlay.remove();
             }
        }, { once: true }); // Garante que o listener rode só uma vez
    };

    closeButton.addEventListener('click', closeModal);
    // Permite fechar clicando fora da caixa (opcional)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
}

/**
 * Exibe um modal de confirmação customizado e retorna uma Promise.
 * @param {string} message A mensagem de confirmação.
 * @returns {Promise<boolean>} Resolve como true se confirmado, false se cancelado.
 */
function showCustomConfirm(message) {
    // Remove qualquer modal existente
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());

    const iconClass = 'fa-solid fa-circle-question';
    const iconColorClass = 'icon-confirm';

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-box modal-confirm">
                <div class="modal-icon ${iconColorClass}">
                    <i class="${iconClass}"></i>
                </div>
                <p class="modal-message">${message}</p>
                <div class="modal-buttons">
                    <button class="modal-btn-secondary modal-cancel">Cancelar</button>
                    <button class="modal-btn-primary modal-confirm">Confirmar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalOverlay = document.body.querySelector('.modal-overlay:last-of-type');
    const confirmButton = modalOverlay.querySelector('.modal-confirm');
    const cancelButton = modalOverlay.querySelector('.modal-cancel');

    // Ativa a animação
    requestAnimationFrame(() => {
        modalOverlay.classList.add('active');
    });


    return new Promise((resolve) => {
        const closeModal = (result) => {
            modalOverlay.classList.remove('active');
            modalOverlay.addEventListener('transitionend', () => {
                if (modalOverlay.parentNode) {
                    modalOverlay.remove();
                }
                resolve(result); // Resolve a Promise com true ou false
            }, { once: true });
        };

        confirmButton.addEventListener('click', () => closeModal(true));
        cancelButton.addEventListener('click', () => closeModal(false));
        // Permite fechar (cancelar) clicando fora
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal(false);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const galleryGrid = document.getElementById('gallery-grid');
    const initialPrompt = document.getElementById('initial-prompt');
    const searchInput = document.getElementById('search-input');
    const squadFilter = document.getElementById('squad-filter');
    const rtFilter = document.getElementById('rt-filter');
    const typeFilter = document.getElementById('type-filter');
    const dateFilter = document.getElementById('date-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');


    const API_ENDPOINT = 'https://clnbw9qle5.execute-api.us-east-2.amazonaws.com';

    // SUBSTITUA A FUNÇÃO initializeGallery() INTEIRA POR ESTA VERSÃO CORRIGIDA:
    async function initializeGallery() {
        try {
            initialPrompt.innerHTML = '<p>Carregando formulários...</p>'; 
            galleryGrid.classList.add('hidden'); 

            const response = await fetch(API_ENDPOINT + '/forms'); 
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(`Erro ${response.status} ao buscar formulários: ${errorData.error || response.statusText}`);
            }
            
            const formsMetadata = await response.json(); 

            // Transforma os metadados no formato que a galeria espera
            allForms = formsMetadata.map(item => {
                // A API (listAllFormsFunction) retorna uma estrutura plana, 
                // então lemos diretamente do 'item'.
                return {
                    id: item.formId,
                    // O campo 'isPublished' é lido aqui, no nível superior
                    isPublished: item.isPublished || false, // Garante que seja false se for null/undefined
                    lastModified: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
                    data: { 
                        formTitle: item.formName,
                        metadata: {
                            squadName: item.squadName, // Lido do nível superior do item
                            rtName: item.rtName        // Lido do nível superior do item
                        },
                        // Lido do nível superior do item
                        questions: [{ evaluationType: item.evaluationType }] 
                    }
                };
            });

            if (allForms.length > 0) {
                initialPrompt.classList.add('hidden');
                galleryGrid.classList.remove('hidden');
                populateFilters();
                applyFilters(); 
            } else {
                initialPrompt.innerHTML = '<p>Nenhum formulário encontrado. Clique em "Novo Formulário" para criar um!</p>';
                galleryGrid.innerHTML = ''; 
                const newCardHTML = `<div class="card_container new-card" onclick="window.location.href='Configurador.html'"><div class="plus-icon">+</div><h3>Criar Novo Formulário</h3></div>`;
                galleryGrid.insertAdjacentHTML('beforeend', newCardHTML);
                galleryGrid.classList.remove('hidden');
                populateFilters(); 
            }

        } catch (error) {
            console.error('Erro ao inicializar a galeria:', error);
            initialPrompt.innerHTML = `<p style="color: red;"><strong>Erro ao carregar formulários:</strong> ${error.message}. Verifique a URL da API e a conexão. (F12 para detalhes)</p>`;
            initialPrompt.classList.remove('hidden');
            galleryGrid.classList.add('hidden');
        }
    }

    function populateFilters() {
        // Extrai valores únicos dos dados carregados
        const squads = [...new Set(allForms.map(form => form.data.metadata.squadName).filter(Boolean))];
        const rts = [...new Set(allForms.map(form => form.data.metadata.rtName).filter(Boolean))];

        squadFilter.innerHTML = '<option value="">Todas</option>';
        squads.sort().forEach(squad => { squadFilter.innerHTML += `<option value="${squad}">${squad}</option>`; });

        rtFilter.innerHTML = '<option value="">Todas</option>';
        rts.sort().forEach(rt => { rtFilter.innerHTML += `<option value="${rt}">${rt}</option>`; });
    }

    function renderGallery(formsToRender) {
        galleryGrid.innerHTML = ''; 

        const newCardHTML = `
            <div class="card_container new-card" onclick="window.location.href='Configurador.html'">
                <div class="plus-icon">+</div>
                <h3>Criar Novo Formulário</h3>
            </div>`;
        galleryGrid.insertAdjacentHTML('beforeend', newCardHTML);

        formsToRender.sort((a, b) => b.lastModified - a.lastModified);
        formsToRender.forEach(form => {
            const date = form.lastModified ? new Date(form.lastModified).toLocaleDateString('pt-BR') : 'N/A';
            const isPublished = form.isPublished; // Pega o status
            const statusClass = isPublished ? "status-publicado" : "status-rascunho";
            const statusText = isPublished ? "Publicado" : "Rascunho";
            
            // --- GERAÇÃO DO LINK ---
            // Pega a URL atual da galeria e substitui o nome do arquivo pelo Renderer
            const currentUrl = window.location.href;
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
            const rendererUrl = `${baseUrl}Renderer.html?formId=${form.id}`;
            // --- FIM DA GERAÇÃO DO LINK ---

            const cardHTML = `
            <div class="card_container" data-id="${form.id}">
                
                ${isPublished ? // Mostra ícones apenas se publicado
                    `<a href="#" onclick="navigator.clipboard.writeText('${rendererUrl}'); showCustomAlert('Link copiado!','sucess'); return false;" title="Copiar link de preenchimento">
                        <i class="link_icon fa-solid fa-link"></i>
                     </a>` 
                    : '<i class="link_icon fa-solid fa-link" style="opacity: 0.3; cursor: default;" title="Publique para obter o link"></i>' // Ícone desabilitado
                }
                
                <div class="conteudo_container">
                    <div class="titulo">
                        <i class="fa-solid fa-pager" title="Nome do Formulário"></i>
                        <h3 class="titulo_forms">${form.data.formTitle || 'Formulário Sem Título'}</h3>
                    </div>
                    <div class="info_container">
                        <i class="fa-solid fa-building" title="Responsável Técnico"></i>
                        <p class="info_texto">${form.data.metadata.rtName || 'N/A'}</p>
                    </div>
                    <div class="info_container">
                        <i class="fa-solid fa-people-group" title="Squad"></i>
                        <p class="info_texto">${form.data.metadata.squadName || 'N/A'}</p>
                    </div>
                    <div class="status_container ${statusClass}">
                        <p class="status_text">${statusText}</p>
                    </div>
                </div>
                
                <div class="control_container">
                    ${isPublished ? // Mostra link de abrir apenas se publicado
                        `<a href="${rendererUrl}" target="_blank" title="Abrir formulário">
                             <i class="fa-solid fa-arrow-right-to-bracket"></i>
                         </a>` 
                        : '<i class="fa-solid fa-arrow-right-to-bracket" style="opacity: 0.3; cursor: default;" title="Publique para abrir"></i>' // Ícone desabilitado
                    }
                    <i class="fa-solid ${isPublished ? 'fa-eye-slash' : 'fa-eye'}" title="${isPublished ? 'Despublicar' : 'Publicar'}" data-action="togglePublish"></i>
                    <i class="fa-solid fa-pen-to-square" title="Editar" data-action="edit"></i>
                    <i class="fa-solid fa-clone" title="Duplicar" data-action="duplicate"></i>
                    <i class="fa-solid fa-trash" title="Excluir" data-action="delete"></i>
                </div>
            </div>`;
            galleryGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // --- Atualize o Event Listener de clique ---
    galleryGrid.addEventListener('click', async (e) => { 
        const actionTarget = e.target.closest('[data-action]'); // Pode ser <i> ou <button>
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const card = actionTarget.closest('.card_container');
        const formId = card.dataset.id;
        const form = allForms.find(f => f.id === formId); 
        
        // Coloca o botão em estado de carregamento/desabilitado (exceto edit)
        const originalIconClass = actionTarget.className;
        if(action !== 'edit'){
            actionTarget.className = 'fas fa-spinner fa-spin'; 
            actionTarget.style.pointerEvents = 'none';
        }

        try { 
            switch(action) {
                case 'edit':
                    window.location.href = `Configurador.html?edit=${formId}`;
                    break;
                case 'duplicate':
                    // ... (código de duplicar inalterado) ...
                    const getResponseDup = await fetch(`${API_ENDPOINT}/forms/${formId}`);
                    if (!getResponseDup.ok) throw new Error('Falha ao buscar original.');
                    const originalConfigDup = await getResponseDup.json();
                    originalConfigDup.formTitle += ' (Cópia)';
                    if(originalConfigDup.metadata) delete originalConfigDup.metadata.formsID;
                    if(originalConfigDup.formId) delete originalConfigDup.formId;
                    const createResponseDup = await fetch(`${API_ENDPOINT}/forms`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(originalConfigDup) });
                    if (!createResponseDup.ok) { const err = await createResponseDup.json().catch(()=>({error: `Erro ${createResponseDup.status}`})); throw new Error(`Falha: ${err.error}`); }
                    showCustomAlert('Formulário duplicado com sucesso!', 'success');
                    initializeGallery();
                    break;
                case 'delete':
                    if (await showCustomConfirm(`Tem certeza que deseja excluir o formulário "${form?.data?.formTitle || formId}"?`)) {
                        const deleteResponse = await fetch(`${API_ENDPOINT}/forms/${formId}`, { method: 'DELETE' });
                        if (!deleteResponse.ok) { const err = await deleteResponse.json().catch(()=>({error: `Erro ${deleteResponse.status}`})); throw new Error(`Falha: ${err.error}`); }
                        card.remove(); 
                        allForms = allForms.filter(f => f.id !== formId); 
                        showCustomAlert('Formulário excluído com sucesso.', 'success');
                        return; // Sai antes de restaurar o ícone
                    } else {
                         actionTarget.className = originalIconClass; // Restaura se cancelou
                         actionTarget.style.pointerEvents = 'auto';
                         return; // Sai da função
                    }
                    break;
                 case 'togglePublish': // --- NOVA AÇÃO ---
                     const publishResponse = await fetch(`${API_ENDPOINT}/forms/${formId}/publish`, { method: 'PUT' });
                     if (!publishResponse.ok) { const err = await publishResponse.json().catch(()=>({error: `Erro ${publishResponse.status}`})); throw new Error(`Falha: ${err.error}`); }
                     const result = await publishResponse.json();
                     showCustomAlert(result.message, 'success');
                     // Atualiza o estado localmente e re-renderiza a galeria
                     const formToUpdate = allForms.find(f => f.id === formId);
                     if(formToUpdate) formToUpdate.isPublished = result.newStatus;
                     applyFilters(); // Re-renderiza a galeria com o estado atualizado
                     return; // Sai antes de restaurar o ícone (applyFilters já redesenha)
            }
            // Restaura o ícone (se não for delete ou togglePublish que recarrega)
             if (action === 'duplicate') { // Edit navega, não precisa restaurar
                  actionTarget.className = originalIconClass; 
                  actionTarget.style.pointerEvents = 'auto';
             }

        } catch (error) {
            console.error(`Erro ao executar ação "${action}":`, error);
            showCustomAlert(`Ocorreu um erro: ${error.message}`, 'error');
            // Restaura o ícone em caso de erro
            actionTarget.className = originalIconClass; 
            actionTarget.style.pointerEvents = 'auto';
        }
    });
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const squad = squadFilter.value;
        const rt = rtFilter.value;
        const type = typeFilter.value;
        const dateValue = dateFilter.value;
        // Converte data para timestamp meia-noite do dia selecionado
        const dateTimestamp = dateValue ? new Date(dateValue + 'T00:00:00').getTime() : 0; 

        const filteredForms = allForms.filter(form => {
            const formTitle = (form.data.formTitle || '').toLowerCase();
            const formSquad = form.data.metadata.squadName || '';
            const formRT = form.data.metadata.rtName || '';
            // Ajuste para pegar o tipo corretamente da estrutura retornada pela API
            const formType = form.data.questions && form.data.questions.length > 0 ? form.data.questions[0].evaluationType : ''; 
            const formDate = form.lastModified;

            if (searchTerm && !formTitle.includes(searchTerm)) return false;
            if (squad && formSquad !== squad) return false;
            if (rt && formRT !== rt) return false;
            if (type && formType !== type) return false;
             // Compara timestamps
            if (dateTimestamp && formDate < dateTimestamp) return false;

            return true;
        });
        renderGallery(filteredForms);
    }

    // --- Event Listeners ---
    [searchInput, squadFilter, rtFilter, typeFilter, dateFilter].forEach(el => {
        el.addEventListener('input', applyFilters); // 'input' é melhor para search e date
    });

    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = ''; squadFilter.value = ''; rtFilter.value = ''; typeFilter.value = ''; dateFilter.value = '';
        applyFilters();
    });

    galleryGrid.addEventListener('click', async (e) => { // Adicionado async
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const card = actionTarget.closest('.card_container');
        const formId = card.dataset.id;
        
        // Coloca o botão em estado de carregamento/desabilitado
        const originalIconClass = actionTarget.className; // Guarda a classe original do ícone
        actionTarget.className = 'fas fa-spinner fa-spin'; // Mostra spinner (requer FontAwesome CSS)
        actionTarget.style.pointerEvents = 'none'; // Desabilita cliques repetidos

        try { 
            switch(action) {
                case 'edit':
                    window.location.href = `configurador.html?edit=${formId}`;
                    // Não precisa restaurar o botão, pois a página vai mudar
                    break;
                case 'duplicate':
                    // Feedback visual inicial
                    actionTarget.className = 'fas fa-spinner fa-spin'; 
                    actionTarget.style.pointerEvents = 'none';

                    try {
                        // 1. Busca a configuração completa do formulário original via API
                        const getResponse = await fetch(`${API_ENDPOINT}/forms/${formId}`);
                        if (!getResponse.ok) {
                            const errorData = await getResponse.json().catch(() => ({ error: `Erro ${getResponse.status}` }));
                            throw new Error(`Falha ao buscar formulário original para duplicar: ${errorData.error || getResponse.statusText}`);
                        }
                        
                        // A API getForm retorna SÓ a configuração
                        const originalConfig = await getResponse.json(); 

                        // 2. Modifica para a cópia (ajusta título, limpa ID)
                        originalConfig.formTitle = `${originalConfig.formTitle || 'Formulário'} (Cópia)`;
                        
                        // *** CORREÇÃO CRUCIAL: Remove o ID antigo ***
                        // Garante que a API createForm irá gerar um NOVO ID único (UUID)
                        if (originalConfig.metadata && originalConfig.metadata.formsID) {
                            delete originalConfig.metadata.formsID; 
                        }
                        // Também remove o formId do nível raiz se existir (depende da resposta exata da API GET)
                        if (originalConfig.formId) {
                            delete originalConfig.formId;
                        }
                        
                        // 3. Salva como um novo formulário usando POST
                        console.log("Enviando para POST (Duplicar):", JSON.stringify(originalConfig, null, 2)); // Log para depurar o JSON enviado
                        const createResponse = await fetch(`${API_ENDPOINT}/forms`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(originalConfig) // Envia a configuração modificada
                        });

                        if (!createResponse.ok) {
                            const errorData = await createResponse.json().catch(() => ({error: `Erro ${createResponse.status}`}));
                            throw new Error(`Falha ao salvar a cópia: ${errorData.error || createResponse.statusText}`);
                        }
                        
                        // 4. Sucesso! Recarrega a galeria para mostrar a nova cópia
                       showCustomAlert('Formulário Duplicado com sucesso.', 'success');
                        initializeGallery(); // Recarrega a lista da API

                    } catch (error) {
                        // Tratamento de erro já existente
                        console.error(`Erro ao executar ação "${action}":`, error);
                        showCustomAlert(`Ocorreu um erro ao duplicar: ${error.message}`,'error');
                        // Restaura o ícone original em caso de erro
                        actionTarget.className = originalIconClass; 
                        actionTarget.style.pointerEvents = 'auto';
                    } finally {
                        // Garante que o ícone seja restaurado SE a galeria não for recarregada (ex: erro)
                        // Se a galeria recarregar (initializeGallery), o botão antigo some de qualquer forma.
                        if (document.body.contains(actionTarget)) { // Verifica se o elemento ainda existe
                            actionTarget.className = originalIconClass; 
                            actionTarget.style.pointerEvents = 'auto';
                        }
                    }
                    break; // Fim do case duplicate
                case 'delete':
                    // Busca o nome APENAS se precisar confirmar
                    const formToDelete = allForms.find(f => f.id === formId); 
                    if (await window.showCustomConfirm(`Tem certeza que deseja excluir o formulário "${formToDelete?.data?.formTitle || formId}"?`)) {
                        const deleteResponse = await fetch(`${API_ENDPOINT}/forms/${formId}`, {
                            method: 'DELETE'
                        });
                        
                        if (!deleteResponse.ok) {
                             const errorData = await deleteResponse.json().catch(() => ({error: 'Erro desconhecido ao excluir.'}));
                             throw new Error(`Falha ao excluir: ${errorData.error}`);
                        }
                        
                        card.remove(); // Remove visualmente
                        allForms = allForms.filter(f => f.id !== formId); // Atualiza a lista local
                        showCustomAlert('Formulário excluído com sucesso.','success'); 
                        // Não precisa restaurar botão, pois o card sumiu
                        return; // Sai da função aqui
                    } else {
                         // Se cancelou o confirm, restaura o botão
                         actionTarget.className = originalIconClass; 
                         actionTarget.style.pointerEvents = 'auto';
                         return; // Sai da função
                    }
                    break; // Fim do case delete
            }
            // Restaura o botão se edit ou duplicate foi bem sucedido (após a lógica)
             if (action === 'edit' || action === 'duplicate') {
                  // Se edit, a página vai navegar. Se duplicate deu certo, a galeria recarrega.
                  // Podemos remover isso ou manter para caso a navegação falhe.
                   actionTarget.className = originalIconClass; 
                   actionTarget.style.pointerEvents = 'auto';
             }

        } catch (error) {
            console.error(`Erro ao executar ação "${action}":`, error);
            showCustomAlert(`Ocorreu um erro: ${error.message}`,'error');
            // Restaura o botão em caso de erro
            actionTarget.className = originalIconClass; 
            actionTarget.style.pointerEvents = 'auto';
        }
    });

    // Inicia o processo de carregamento
    initializeGallery();
});