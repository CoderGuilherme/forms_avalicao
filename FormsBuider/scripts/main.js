
const API_ENDPOINT = 'https://clnbw9qle5.execute-api.us-east-2.amazonaws.com';



const urlParams = new URLSearchParams(window.location.search);
const formIdToEdit = urlParams.get('edit');

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

// Variável para guardar a configuração, será preenchida depois
let formConfig = {
    formTitle: "Novo Formulário",
    headerSubtitle: "Formulário de Avaliação",
    metadata: { autor: "", rtName: "", squadName: "", formsID: "" },
    formStyle: 'Standard',
    questions: []
};

// --- FIM DA SUBSTITUIÇÃO ---

document.addEventListener('DOMContentLoaded', async () => {

    // --- CARREGAMENTO INICIAL DE DADOS ---
    const editDataJSON = localStorage.getItem('editFormData');
    let initialFormConfig = null;

    if (editDataJSON) {
        try {
            initialFormConfig = JSON.parse(editDataJSON);
            localStorage.removeItem('editFormData'); // Limpa após o uso
        } catch (e) {
            console.error("Erro ao carregar dados para edição:", e);
        }
    }

    // --- ELEMENTOS GLOBAIS DO DOM ---
    const body = document.body;
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const previewWrapper = document.getElementById('preview-wrapper');
    const codeViewWrapper = document.getElementById('code-view-wrapper');
    const codeEditor = document.getElementById('code-editor');
    const btnShowPreview = document.getElementById('btn-show-preview');
    const btnShowCode = document.getElementById('btn-show-code');
    const btnCopyCode = document.getElementById('btn-copy-code');

    // --- DADOS E ESTADO DA APLICAÇÃO ---
    const icons = {
        remove: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
        eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
        eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
        chevron: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'
    };

    let formConfig = initialFormConfig || {
        formTitle: "Avalie a experiência",
        headerSubtitle: "Formulário de Avaliação",
        metadata: { autor: "", rtName: "", squadName: "", formsID: "" },
        formStyle: 'Standard',
        questions: []
    };

    let previewData = {}; 
    let previewCurrentStep = 0;
    const likertScoreMap = { "Muito Ruim": 1, "Ruim": 2, "Regular": 3, "Bom": 4, "Muito Bom": 5 };

    // --- LÓGICA DE CONTROLE PRINCIPAL ---
    toggleSidebarBtn.addEventListener('click', () => body.classList.toggle('sidebar-collapsed'));
    btnShowPreview.addEventListener('click', () => switchView('preview'));
    btnShowCode.addEventListener('click', () => switchView('code'));

    btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(codeEditor.value);
        btnCopyCode.textContent = 'Copiado!';
        setTimeout(() => { btnCopyCode.textContent = 'Copiar Código'; }, 2000);
    });

    codeEditor.addEventListener('blur', () => {
        codeEditor.classList.remove('error');
        try {
            const uiState = captureUIState();
            const newConfig = JSON.parse(codeEditor.value);
            if (typeof newConfig.formTitle !== 'string' || !Array.isArray(newConfig.questions) || !newConfig.metadata) {
                throw new Error('Estrutura do JSON inválida.');
            }
            formConfig = newConfig;
            previewCurrentStep = 0;
            previewData = {};
            renderSidebarContent();
            applyUIState(uiState);
            updateViews();
        } catch (e) {
            console.error("Erro ao parsear JSON:", e);
            codeEditor.classList.add('error');
            showCustomAlert('Erro no formato JSON! Verifique o código e tente novamente. As alterações não foram salvas.','error');
        }
    });

    function switchView(view) {
        if (view === 'preview') {
            previewWrapper.classList.remove('hidden');
            codeViewWrapper.classList.add('hidden');
            btnShowPreview.classList.add('active');
            btnShowCode.classList.remove('active');
        } else {
            previewWrapper.classList.add('hidden');
            codeViewWrapper.classList.remove('hidden');
            btnShowPreview.classList.remove('active');
            btnShowCode.classList.add('active');
            updateCodeView();
        }
    }

    // --- ADICIONE ESTA NOVA FUNÇÃO ---
    async function loadFormData(formId) {
        try {
            const response = await fetch(`${API_ENDPOINT}/forms/${formId}`);
            if (!response.ok) {
                 if (response.status === 404) throw new Error(`Formulário com ID "${formId}" não encontrado.`);
                 else throw new Error(`Erro ${response.status} ao buscar dados do formulário.`);
            }
            formConfig = await response.json(); // API getForm retorna o formConfiguration
            // Garante que a estrutura base exista se a API retornar algo inesperado
             if (!formConfig.metadata) formConfig.metadata = { autor: "", rtName: "", squadName: "", formsID: formId };
             if (!formConfig.formStyle) formConfig.formStyle = 'Standard';
             if (!formConfig.questions) formConfig.questions = [];
             formConfig.metadata.formsID = formId; // Garante que temos o ID para futuras atualizações

        } catch (error) {
            console.error("Erro ao carregar dados para edição:", error);
            showCustomAlert(`Não foi possível carregar o formulário para edição: ${error.message}`,'error');
            // Mantém a configuração padrão (novo formulário) em caso de erro
            formConfig = { 
                formTitle: "Novo Formulário (Erro ao Carregar)", headerSubtitle: "Formulário de Avaliação",
                metadata: { autor: "", rtName: "", squadName: "", formsID: ""},
                formStyle: 'Standard', questions: [] 
            };
        }
    }
    // --- FIM DA NOVA FUNÇÃO ---

    // --- LÓGICA DE PRESERVAÇÃO DE ESTADO DA UI ---
    function captureUIState() {
        const questionsState = [...document.querySelectorAll('#questions-container .question-card')].map(card => card.classList.contains('collapsed'));
        const contentWrapper = document.querySelector('.sidebar-content-wrapper'); // Pega o elemento primeiro
        return {
            // VERIFICA SE O ELEMENTO EXISTE ANTES DE ACESSAR scrollTop
            scrollTop: contentWrapper ? contentWrapper.scrollTop : 0, // Retorna 0 se não existir
            metadataCollapsed: document.getElementById('metadata-content')?.classList.contains('collapsed'),
            questionsCollapsed: questionsState
        };
    }

    function applyUIState(state) {
        if (!state) return;
        const metadataContent = document.getElementById('metadata-content');
        if (metadataContent && state.metadataCollapsed) {
            metadataContent.classList.add('collapsed');
            document.querySelector('#toggle-metadata .btn-toggle').classList.add('collapsed');
        }
        document.querySelectorAll('#questions-container .question-card').forEach((card, index) => {
            if (state.questionsCollapsed[index]) {
                card.classList.add('collapsed');
                card.querySelector('.collapsible-content').classList.add('collapsed');
                card.querySelector('.btn-toggle').classList.add('collapsed');
            }
        });
        setTimeout(() => {
            document.querySelector('.sidebar-content-wrapper').scrollTop = state.scrollTop;
        }, 0);
    }

        // SUBSTITUA a função renderSidebarContent INTEIRA por esta versão mais robusta:
    // SUBSTITUA a função renderSidebarContent INTEIRA por esta versão SEM COMENTÁRIOS JSX:
    function renderSidebarContent() {
        const meta = formConfig?.metadata || { autor: "", rtName: "", squadName: "", formsID: "" };
        const currentStyle = formConfig?.formStyle || 'Standard';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-header-content">
                    <div class="sidebar-brand">
                        <img src="./imagem/logo_azul.svg" alt="Logo" class="logo">
                        <div><h1>Configurador</h1><p>Design de formulários</p></div>
                    </div>
                    <i class="fa-solid fa-grip-vertical"></i>
                    <a href="galeria.html" class="nav-link">Ir para Galeria</a>
                </div>
            </div>
            <div class="sidebar-content-wrapper">
                <div class="config-section-wrapper">
                    <div class="config-section-header"><div class="config-section-header-title"><div class="indicator" style="background-color: var(--indigo-400);"></div><h2>Configuração Geral</h2></div></div>
                    <div class="input-group" style="display: flex; flex-direction: column; gap: 1.25rem;">
                        <div><label for="formTitle">Título Principal (H1)</label><input type="text" id="formTitle" data-config-path="formTitle" value="${formConfig?.formTitle || ''}" placeholder="Avalie a experiência"></div>
                        <div><label for="headerSubtitle">Subtítulo do Cabeçalho (H3)</label><input type="text" id="headerSubtitle" data-config-path="headerSubtitle" value="${formConfig?.headerSubtitle || ''}" placeholder="Formulário de Avaliação"></div>
                        <div>
                            <label for="formStyleSelect">Estilo do Formulário</label>
                            <select id="formStyleSelect" data-config-path="formStyle">
                                <option value="Standard" ${currentStyle === 'Standard' ? 'selected' : ''}>Padrão (Múltiplas Etapas)</option>
                                <option value="Footer" ${currentStyle === 'Footer' ? 'selected' : ''}>Footer (Pergunta Única)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="config-section-wrapper">
                    <div class="config-section-header" id="toggle-metadata" style="cursor: pointer;">
                        <div class="config-section-header-title"><div class="indicator" style="background-color: var(--orange-400);"></div><h2>Metadados</h2></div>
                        <button class="btn-toggle">${icons.chevron}</button>
                    </div>
                    <div id="metadata-content" class="collapsible-content"><div style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.25rem;">
                        <div class="input-group"><label for="meta-autor">Autor</label><input type="text" id="meta-autor" data-config-path="metadata.autor" value="${meta.autor || ''}" placeholder="Nome do Autor"></div>
                        <div class="input-group"><label for="meta-rtName">RT Name</label><input type="text" id="meta-rtName" data-config-path="metadata.rtName" value="${meta.rtName || ''}" placeholder="RT Name"></div>
                        <div class="input-group"><label for="meta-squadName">Squad Name</label><input type="text" id="meta-squadName" data-config-path="metadata.squadName" value="${meta.squadName || ''}" placeholder="Squad Name"></div>
                        <div class="input-group"><label for="formsID">Forms ID (Automático)</label><input type="text" id="formsID" value="${meta.formsID || ''}" disabled></div>
                    </div></div>
                </div>
                <div class="config-section-wrapper" style="border-bottom: none;">
                    <div class="config-section-header"><div class="config-section-header-title"><div class="indicator" style="background-color: var(--emerald-400);"></div><h2>Perguntas</h2></div></div>
                    <div id="questions-container">${(formConfig?.questions || []).map((q, i) => renderQuestionConfig(q, i)).join('')}</div>
                </div>
            </div>
            <div class="sidebar-footer glass-effect">
                <button id="addQuestion" class="btn-footer"><span><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Adicionar Pergunta</span></button>
                <button id="saveForm" class="btn-footer"><span><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3l-4 4-4-4z" /><path d="M12 15V3" /></svg>Salvar Formulário</span></button>
            </div>`;
        attachSidebarListeners();
    }

    // SUBSTITUA a função renderQuestionConfig INTEIRA por esta versão SEM COMENTÁRIOS JSX:
    function renderQuestionConfig(question, index) {
        const questionData = {
            key: question?.key || `pergunta_temp_${index}`,
            title: question?.title || `Pergunta ${index + 1}`,
            evaluationType: question?.evaluationType || 'Likert',
            showEvaluation: question?.showEvaluation !== false,
            likertQuestion: question?.likertQuestion || '',
            showTags: question?.showTags === true,
            tagsQuestionText: question?.tagsQuestionText || '',
            adjectives: {
                positive: question?.adjectives?.positive || [],
                negative: question?.adjectives?.negative || []
            },
            commentSection: {
                visible: question?.commentSection?.visible === true,
                title: question?.commentSection?.title || '',
                placeholder: question?.commentSection?.placeholder || ''
            },
            showPriorityTags: question?.showPriorityTags === true
        };

        const titlePrefix = formConfig.questions.length > 1 ? `${index + 1}. ` : '';
        const showBacklogOptions = questionData.evaluationType === 'Backlog';
        const showStandardEvalOptions = !showBacklogOptions;
        const showEval = questionData.showEvaluation;
        const showTags = questionData.showTags;
        const showComments = questionData.commentSection.visible;
        const showPriorityTags = questionData.showPriorityTags;

        return `
            <div class="question-card" data-index="${index}">
                <div class="question-card-header"><h3>${titlePrefix}${questionData.title}</h3><div class="controls"><button class="btn-toggle">${icons.chevron}</button><button class="btn-remove-question" title="Remover Pergunta">${icons.remove}</button></div></div>
                <div class="collapsible-content question-body">
                    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                        <div class="input-group"><label>Título da Etapa</label><input type="text" value="${questionData.title}" data-config-path="questions[${index}].title" placeholder="Nova Pergunta"></div>
                        <hr style="border: none; border-top: 1px solid var(--border-color); margin: -0.5rem 0;" />
                        <div class="input-group"><label>Tipo da Avaliação</label>
                            <select data-config-path="questions[${index}].evaluationType">
                                <option value="Likert" ${questionData.evaluationType === 'Likert' ? 'selected' : ''}>Likert</option>
                                <option value="NPS(0-5)" ${questionData.evaluationType === 'NPS(0-5)' ? 'selected' : ''}>NPS (0-5)</option>
                                <option value="NPS(0-10)" ${questionData.evaluationType === 'NPS(0-10)' ? 'selected' : ''}>NPS (0-10)</option>
                                <option value="Backlog" ${questionData.evaluationType === 'Backlog' ? 'selected' : ''}>Backlog</option>
                            </select>
                        </div>
                        <div class="standard-eval-options ${showStandardEvalOptions ? '' : 'hidden'}">
                            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                                <div class="toggle-group"><label>Mostrar avaliação?</label><button class="btn-toggle-visibility" data-toggle-path="questions[${index}].showEvaluation">${showEval ? icons.eye : icons.eyeOff}</button></div>
                                <div class="question-section-wrapper ${showEval ? '' : 'hidden'}"><div style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.25rem;">
                                    <div class="input-group"><label>Texto da Pergunta</label><input type="text" value="${questionData.likertQuestion}" data-config-path="questions[${index}].likertQuestion" placeholder="Qual sua avaliação sobre este tópico?"></div>
                                </div></div>
                            </div>
                        </div>
                        <div class="backlog-eval-options ${showBacklogOptions ? '' : 'hidden'}">
                            <div class="toggle-group"><label>Mostrar Prioridades?</label><button class="btn-toggle-visibility" data-toggle-path="questions[${index}].showPriorityTags">${showPriorityTags ? icons.eye : icons.eyeOff}</button></div>
                        </div>
                        <hr style="border: none; border-top: 1px solid var(--border-color); margin: -0.5rem 0;" />
                        <div class="toggle-group"><label>Mostrar tags?</label><button class="btn-toggle-visibility" data-toggle-path="questions[${index}].showTags">${showTags ? icons.eye : icons.eyeOff}</button></div>
                        <div class="question-section-wrapper ${showTags ? '' : 'hidden'}"><div style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.25rem;">
                            <div class="input-group"><label>Texto da Pergunta (Tags)</label><input type="text" value="${questionData.tagsQuestionText}" data-config-path="questions[${index}].tagsQuestionText" placeholder="Selecione as tags relevantes (opcional)"></div>
                            <div class="input-group"><label>Adjetivos Positivos</label><textarea data-config-path="questions[${index}].adjectives.positive" placeholder="Bom, Rápido, Útil">${questionData.adjectives.positive.join(', ')}</textarea></div>
                            <div class="input-group"><label>Adjetivos Negativos</label><textarea data-config-path="questions[${index}].adjectives.negative" placeholder="Ruim, Lento, Confuso">${questionData.adjectives.negative.join(', ')}</textarea></div>
                        </div></div>
                        <hr style="border: none; border-top: 1px solid var(--border-color); margin: -0.5rem 0;" />
                        <div class="toggle-group"><label>Mostrar comentários?</label><button class="btn-toggle-visibility" data-toggle-path="questions[${index}].commentSection.visible">${showComments ? icons.eye : icons.eyeOff}</button></div>
                        <div class="question-section-wrapper ${showComments ? '' : 'hidden'}"><div style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.25rem;">
                            <div class="input-group"><label>Título do Comentário</label><input type="text" value="${questionData.commentSection.title}" data-config-path="questions[${index}].commentSection.title" placeholder="Comentários (opcional)"></div>
                            <div class="input-group"><label>Placeholder do Comentário</label><input type="text" value="${questionData.commentSection.placeholder}" data-config-path="questions[${index}].commentSection.placeholder" placeholder="Deixe aqui seu feedback..."></div>
                        </div></div>
                    </div>
                </div>
            </div>`;
    }

    // --- FUNÇÕES DE MANIPULAÇÃO DE ESTADO ---
    function getPropertyByPath(obj, path) {
        const pList = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let schema = obj;
        for (let i = 0; i < pList.length; i++) {
            if (schema === undefined) return undefined;
            schema = schema[pList[i]];
        }
        return schema;
    }

    function updateState(path, value) {
        let schema = formConfig;
        const pList = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        const len = pList.length;
        for (let i = 0; i < len - 1; i++) {
            const elem = pList[i];
            if (!schema[elem]) schema[elem] = (pList[i + 1].match(/^\d+$/)) ? [] : {};
            schema = schema[elem];
        }
        if (path.includes('adjectives')) {
            schema[pList[len - 1]] = value.split(',').map(item => item.trim()).filter(Boolean);
        } else {
            schema[pList[len - 1]] = value;
        }

        if (path.includes('.title') && !path.includes('commentSection')) {
            const key = value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const keyPath = path.replace('.title', '.key');
            let keySchema = formConfig;
            const keyPList = keyPath.replace(/\[(\d+)\]/g, '.$1').split('.');
            for (let i = 0; i < keyPList.length - 1; i++) {
                keySchema = keySchema[keyPList[i]];
            }
            keySchema[keyPList[keyPList.length - 1]] = key;
        }
    }


    // --- FUNÇÕES DE ATUALIZAÇÃO DA UI (VIEWS) ---
    function updateViews() {
        updatePreview();
        updateCodeView();
        updateFormsID();
    }

    function updateCodeView() {
        codeEditor.value = JSON.stringify(formConfig, null, 2);
    }

    function updateFormsID() {
        const title = (formConfig.formTitle || '').toLowerCase().replace(/\s+/g, '_');
        const rt = (formConfig.metadata?.rtName || '').toLowerCase().replace(/\s+/g, '_');
        const squad = (formConfig.metadata?.squadName || '').toLowerCase().replace(/\s+/g, '_');
        const newID = `${rt}_${squad}_${title}`;
        if (formConfig.metadata) formConfig.metadata.formsID = newID;
        const formsIDInput = document.getElementById('formsID');
        if (formsIDInput) formsIDInput.value = newID;
    }

    // --- FUNÇÕES AUXILIARES DE RENDERIZAÇÃO DO PREVIEW ---
    function createLikertHTML(key) {
        const options = [{ value: "Muito Ruim", icon: "muito_ruim" }, { value: "Ruim", icon: "ruim" }, { value: "Regular", icon: "regular" }, { value: "Bom", icon: "bom" }, { value: "Muito Bom", icon: "muito_bom" }];
        return `<div class="likert-scale">${options.map(opt => `<input type="radio" id="likert-${key}-${opt.icon}" name="eval_${key}" value="${opt.value}" ${previewData[`eval_${key}`] === opt.value ? 'checked' : ''} required><label for="likert-${key}-${opt.icon}"><img src="./imagem/icon_${opt.icon}.svg" alt="${opt.value}" class="likert-icon"><span class="label-text">${opt.value}</span></label>`).join('')}</div>`;
    }

    function createNPSHTML(key, max) {
        let optionsHTML = '';
        for (let i = 0; i <= max; i++) {
            optionsHTML += `<input type="radio" id="nps-${key}-${i}" name="eval_${key}" value="${i}" ${previewData[`eval_${key}`] == i ? 'checked' : ''} required><label for="nps-${key}-${i}">${i}</label>`;
        }
        return `<div class="nps-scale">${optionsHTML}</div>`;
    }

    function createEvaluationScaleHTML(questionConfig) {
        const type = questionConfig.evaluationType || 'Likert';
        switch (type) {
            case 'NPS(0-5)': return createNPSHTML(questionConfig.key, 5);
            case 'NPS(0-10)': return createNPSHTML(questionConfig.key, 10);
            case 'Backlog': return '';
            default: return createLikertHTML(questionConfig.key);
        }
    }

    // --- RENDERIZAÇÃO E LÓGICA DO PREVIEW ---
    function updatePreview() {
        if (formConfig.formStyle === 'Footer') {
            renderFooterPreview();
        } else {
            renderStandardPreview();
        }
    }

    function renderStandardPreview() {
        let formHTML = `<header class="page-header"><img class="logo" src="./imagem/logo_azul.svg" alt="Logo"><div class="header-title-container"><h3 id="form-theme-title">${formConfig.headerSubtitle || ''}</h3><h1 id="dashboard-title-display">${formConfig.formTitle}</h1></div></header><div class="survey-container"><form id="dashboard-survey"><div class="progress-bar"><div class="progress-bar-fill"></div></div><div id="dynamic-form-steps">`;
        if (formConfig.questions.length === 0) {
            formHTML += `<div class="form-step active"><h2>Adicione uma pergunta na sidebar para começar.</h2></div>`;
        } else {
            formConfig.questions.forEach((stepConfig, index) => {
                const titlePrefix = formConfig.questions.length > 1 ? `${index + 1}. ` : '';
                let evalHTML = stepConfig.showEvaluation !== false ? createEvaluationScaleHTML(stepConfig) : '';
                
                let questionTextHTML = '';
                // PERSONALIZAÇÃO: Mostra o texto da pergunta APENAS se houver mais de 1 pergunta
                if (formConfig.questions.length > 1 && stepConfig.showEvaluation !== false && stepConfig.likertQuestion) {
                    questionTextHTML = `<label class="evaluation-question-label">${stepConfig.likertQuestion}</label>`;
                }
                
                let priorityHTML = '';
                if (stepConfig.evaluationType === 'Backlog' && stepConfig.showPriorityTags === true) {
                    const priorities = [{ label: 'Urgente', class: 'urgent' }, { label: 'Alta', class: 'high' }, { label: 'Média', class: 'medium' }, { label: 'Baixa', class: 'low' }];
                    const selectedPriority = previewData[`priority_${stepConfig.key}`];
                    priorityHTML = `<div class="form-group"><label>Prioridade da Solicitação</label><div class="priority-pills">${priorities.map(p => `<div class="priority-pill ${p.class} ${selectedPriority === p.label ? 'active' : ''}" data-key="${stepConfig.key}">${p.label}</div>`).join('')}</div></div>`;
                }
                
                let tagsHTML = '';
                if (stepConfig.showTags === true) {
                    const tagsLabel = stepConfig.tagsQuestionText || 'Selecione as tags relevantes (opcional)';
                    tagsHTML = `<div class="form-group"><label>${tagsLabel}</label><div class="adjective-pills">`;
                    
                    if (stepConfig.evaluationType === 'Backlog') {
                        const allAdjectives = [...(stepConfig.adjectives?.positive || []), ...(stepConfig.adjectives?.negative || [])];
                        const activeTags = previewData[`tags_${stepConfig.key}`] || [];
                        if (allAdjectives.length > 0) {
                            tagsHTML += allAdjectives.map(adj => `<div class="pill ${activeTags.includes(adj) ? 'active' : ''}" data-key="${stepConfig.key}">${adj}</div>`).join('');
                        } else {
                            tagsHTML += `<div class="pill pill-placeholder">&nbsp;</div><div class="pill pill-placeholder">&nbsp;</div><div class="pill pill-placeholder">&nbsp;</div>`;
                        }
                    } else {
                        tagsHTML += `<div class="pill pill-placeholder">&nbsp;</div><div class="pill pill-placeholder">&nbsp;</div><div class="pill pill-placeholder">&nbsp;</div>`;
                    }
                    tagsHTML += `</div></div>`;
                }

                let commentsHTML = '';
                if (stepConfig.commentSection?.visible === true) {
                    const commentText = previewData[`comments_${stepConfig.key}`] || '';
                    commentsHTML = `<div class="form-group"><label for="comments-${stepConfig.key}">${stepConfig.commentSection.title || 'Comentários'}</label><textarea id="comments-${stepConfig.key}" name="comments_${stepConfig.key}" placeholder="${stepConfig.commentSection.placeholder || ''}">${commentText}</textarea></div>`;
                }

                formHTML += `<div class="form-step" data-step="${index}"><h2>${titlePrefix}${stepConfig.title}</h2>${questionTextHTML}${evalHTML}${priorityHTML}${tagsHTML}${commentsHTML}</div>`;
            });
        }
        formHTML += `</div><div class="form-step" id="thank-you-message"><img class="thank-you-image" src="./imagem/Final_forms.svg" alt="Concluído"><h2>Obrigado!</h2><p>Seu feedback foi recebido.</p></div><div class="navigation-buttons"><button type="button" class="btn-prev">Voltar</button><button type="button" class="btn btn-next">Próximo</button><button type="submit" class="btn btn-submit" style="display:none;">Enviar Avaliação</button></div></form></div>`;
        previewWrapper.innerHTML = formHTML;
        attachStandardPreviewListeners();
        renderPreviewStep();
    }

    function renderFooterPreview() {
        const question = formConfig.questions[0];
        if (!question) {
            previewWrapper.innerHTML = `<div class="footer-survey-container" style="text-align: center; padding: 40px;">Adicione pelo menos uma pergunta na sidebar.</div>`;
            return;
        }

        const title = formConfig.formTitle || 'Avalie a experiência';
        
        // PERSONALIZAÇÃO: 'subtitle' agora usa 'likertQuestion', que está sincronizado com 'title'
        const subtitle = question.likertQuestion || 'O que você achou?';
        
        const showEval = question.showEvaluation !== false;
        const showTags = question.showTags === true;
        const showComments = question.commentSection?.visible === true;
        const commentData = previewData[`comments_${question.key}`] || '';
        const activeTags = previewData[`tags_${question.key}`] || [];

        let evalHTML = '';
        if (showEval) {
            if (question.evaluationType === 'Likert' || !question.evaluationType) {
                evalHTML = createLikertHTML(question.key).replace('likert-scale', 'likert-inline');
            } else if (question.evaluationType === 'NPS(0-5)') {
                evalHTML = createNPSHTML(question.key, 5).replace('nps-scale', 'likert-inline nps-scale');
            } else if (question.evaluationType === 'NPS(0-10)') {
                evalHTML = createNPSHTML(question.key, 10).replace('nps-scale', 'likert-inline nps-scale');
            }
        }

        let tagsHTML = '';
        if (showTags) {
            const tagsLabel = question.tagsQuestionText || 'Por quê? (Selecione ao menos uma opção)';
            const allAdjectives = [...(question.adjectives?.positive || []), ...(question.adjectives?.negative || [])];
            tagsHTML = `<div class="form-group">
                <label>${tagsLabel}</label>
                <div class="category-pills">
                    ${allAdjectives.length > 0 ? allAdjectives.map(adj => `<div class="pill ${activeTags.includes(adj) ? 'active' : ''}" data-key="${question.key}">${adj}</div>`).join('') : '<span style="font-size: 12px; color: #7f8c8d;">Configure adjetivos na sidebar.</span>'}
                </div>
            </div>`;
        }

        let commentsHTML = '';
        if (showComments) {
            commentsHTML = `<textarea id="comments-${question.key}" name="comments_${question.key}" placeholder="${question.commentSection.placeholder || 'Deixe um comentário (opcional)...'}">${commentData}</textarea>`;
        }

        previewWrapper.innerHTML = `
            <div class="footer-survey-container" id="survey-wrapper">
                <form id="footer-survey">
                    <div class="survey-header">
                        <div class="title-group">
                            <h3 id="survey-title">${title}</h3>
                            <p id="survey-subtitle">${subtitle}</p>
                        </div>
                        <img src="./imagem/logo_azul.svg" alt="Logo" class="logo">
                    </div>
                    ${evalHTML}
                    ${tagsHTML}
                    <div class="comment-submit-group">
                        ${commentsHTML}
                        <button type="submit" class="btn-submit" id="submit-btn-footer">Enviar</button>
                    </div>
                </form>
                <div id="thank-you-message-footer" style="display: none;">
                    <h3>Obrigado pelo seu feedback!</h3>
                </div>
            </div>`;
        attachFooterPreviewListeners();
    }


    function navigatePreview(direction) {
        if (direction > 0 && !validateStandardPreviewStep()) return;
        const newStep = previewCurrentStep + direction;
        if (newStep >= 0 && newStep < formConfig.questions.length) {
            previewCurrentStep = newStep;
            renderPreviewStep();
        }
    }

    function renderPreviewStep() {
        const total = formConfig.questions.length;
        if (total === 0) return;
        const steps = previewWrapper.querySelectorAll('#dynamic-form-steps .form-step, #thank-you-message');
        steps.forEach((step, index) => step.classList.toggle('active', index === previewCurrentStep));
        const progressBarFill = previewWrapper.querySelector('.progress-bar-fill');
        if (progressBarFill) {
            progressBarFill.style.width = `${total > 1 ? (previewCurrentStep / (total - 1)) * 100 : (previewCurrentStep > 0 ? 100 : 0)}%`;
        }
        const navButtons = previewWrapper.querySelector('.navigation-buttons');
        if (navButtons) {
            if (previewCurrentStep >= total) {
                navButtons.style.display = 'none';
            } else {
                navButtons.style.display = 'flex';
                previewWrapper.querySelector('.btn-prev').style.display = previewCurrentStep === 0 ? 'none' : 'inline-block';
                previewWrapper.querySelector('.btn-next').style.display = previewCurrentStep < total - 1 ? 'inline-block' : 'none';
                previewWrapper.querySelector('.btn-submit').style.display = previewCurrentStep === total - 1 ? 'inline-block' : 'none';
            }
        }
    }

    function validateStandardPreviewStep() {
        if (previewCurrentStep >= formConfig.questions.length) return true;
        const stepConfig = formConfig.questions[previewCurrentStep];
        if (!stepConfig || stepConfig.evaluationType === 'Backlog' || stepConfig.showEvaluation === false) return true;
        const radioName = `eval_${stepConfig.key}`;
        if (!previewWrapper.querySelector(`input[name="${radioName}"]:checked`)) {
            showCustomAlert('Por favor, selecione uma avaliação para continuar.','success');
            return false;
        }
        return true;
    }

    function attachSidebarListeners() {
        // Esta flag impede que os listeners sejam adicionados mais de uma vez
        if (sidebar.dataset.listenersAttached === 'true') return;

        // --- MANIPULADORES DE INPUT/CHANGE (para digitação, seleção, etc.) ---
        const handleInputChange = (target) => { 
            const path = target.dataset.configPath;
            if (!path) return; 

            const value = target.type === 'checkbox' ? target.checked : target.value;
            updateState(path, value); // Atualiza o objeto formConfig localmente
            
            // Se mudar o TIPO de avaliação ou o ESTILO do formulário, recarrega a sidebar
            if (path.endsWith('.evaluationType') || path === 'formStyle') {
                const uiState = captureUIState();
                renderSidebarContent();
                applyUIState(uiState);
            } else {
                // Para outras mudanças, apenas atualiza as views (Preview, Código, FormsID)
                updateViews();
            }
        };
        
        sidebar.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') handleInputChange(e.target); });
        sidebar.addEventListener('blur', (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') handleInputChange(e.target); }, true);
        sidebar.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) { handleInputChange(e.target); e.target.blur();}});
        sidebar.addEventListener('keyup', (e) => {
            const target = e.target;
            const path = target.dataset.configPath;
            if (!path) return;

            // Atualiza o estado localmente sem recarregar a sidebar inteira
            updateState(path, target.value, true); // O 'true' lida com a chave automática

            // Atualiza o título do card da pergunta em tempo real
            if (path.includes('questions') && path.endsWith('.title') && !path.includes('commentSection')) {
                const card = target.closest('.question-card'); if (!card) return;
                const header = card.querySelector('.question-card-header h3'); const index = parseInt(card.dataset.index, 10);
                const prefix = formConfig.questions.length > 1 ? `${index + 1}. ` : ''; header.textContent = prefix + target.value;
            }
            // Atualiza o formsID em tempo real
            if (path === 'formTitle' || path === 'metadata.rtName' || path === 'metadata.squadName') { updateFormsID(); }
            // Atualiza o cabeçalho do preview em tempo real
            if (path === 'formTitle') {
                const titleDisplay = previewWrapper.querySelector('#dashboard-title-display'); if (titleDisplay) titleDisplay.textContent = target.value;
            }
            if (path === 'headerSubtitle') {
                const subtitleDisplay = previewWrapper.querySelector('#form-theme-title'); if (subtitleDisplay) subtitleDisplay.textContent = target.value;
            }
            updateCodeView(); // Atualiza a view de código a cada tecla
        });

        // --- MANIPULADOR DE CLIQUE DELEGADO (para todos os botões da sidebar) ---
        sidebar.addEventListener('click', async (e) => { // Adicionado async para o saveBtn
            const addBtn = e.target.closest('#addQuestion');
            const saveBtn = e.target.closest('#saveForm');
            const metadataToggleBtn = e.target.closest('#toggle-metadata');
            const removeBtn = e.target.closest('.btn-remove-question');
            const visibilityBtn = e.target.closest('.btn-toggle-visibility');
            const collapseBtn = e.target.closest('.btn-toggle:not(.btn-toggle-visibility)');

            if (addBtn) {
                const i = formConfig.questions.length;
                const newTitle = `Nova Pergunta ${i + 1}`;
                const shouldSyncTitle = (formConfig.formStyle === 'Standard' && i === 0) || (formConfig.formStyle === 'Footer');
                const newQuestion = { key: `pergunta_${Date.now()}`, title: newTitle, showEvaluation: true, evaluationType: "Likert", likertQuestion: shouldSyncTitle ? newTitle : "", showTags: true, tagsQuestionText: "", showPriorityTags: true, adjectives: { positive: ['Bom', 'Rápido', 'Útil'], negative: ['Ruim', 'Lento', 'Confuso'] }, commentSection: { visible: true, title: "", placeholder: "" } };
                formConfig.questions.push(newQuestion);
                const uiState = captureUIState();
                renderSidebarContent();
                applyUIState(uiState);
                updateViews();
                document.querySelector(`.question-card[data-index="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } 
            else if (saveBtn) {
                // Usa o ID que está no formConfig (pode ter vindo da URL ou sido gerado pelo create)
                const currentFormId = formConfig.metadata?.formsID; 
                
                // Valida campos obrigatórios para salvar
                if (!formConfig.formTitle || !formConfig.metadata.rtName || !formConfig.metadata.squadName) {
                    showCustomAlert("Por favor, preencha o Título Principal, RT Name e Squad Name antes de salvar.",'success');
                    return;
                }

                saveBtn.disabled = true; 
                const originalSpanHTML = saveBtn.querySelector('span').innerHTML; // Guarda o HTML original
                saveBtn.querySelector('span').textContent = 'Salvando...';

                try {
                    let response;
                    let method;
                    let url;

                    // --- CORREÇÃO AQUI ---
                    // A decisão AGORA se baseia PRIMEIRO se carregamos um form para editar (formIdToEdit)
                    if (formIdToEdit && formConfig.metadata?.formsID === formIdToEdit) {
                        // Se temos um ID da URL E ele corresponde ao ID carregado na configuração, é uma ATUALIZAÇÃO
                        method = 'PUT';
                        url = `${API_ENDPOINT}/forms/${formIdToEdit}`; 
                        console.log(`Enviando ${method} para ${url}`); // Log para depuração
                    } else {
                        // Caso contrário (é um formulário novo ou uma cópia não salva), é uma CRIAÇÃO
                        method = 'POST';
                        url = `${API_ENDPOINT}/forms`;
                        console.log(`Enviando ${method} para ${url}`); // Log para depuração
                        // Remove qualquer ID preexistente (como o gerado por rt_squad_title ou de uma cópia)
                        // A API (createForm) gerará o UUID correto.
                        if (formConfig.metadata) delete formConfig.metadata.formsID; 
                    }
          
                    response = await fetch(url, {
                        method: method,
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(formConfig) // Envia o objeto formConfig completo
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(()=>({error: `Erro ${response.status}`}));
                        throw new Error(errorData.error || `Erro ${response.status} ao salvar.`);
                    }

                    const result = await response.json();
                    
                    // Se foi criação (POST), atualiza o ID local com o ID retornado pela API
                    if (method === 'POST' && result.formId) {
                        formConfig.metadata.formsID = result.formId; // Atualiza o objeto local
                        updateFormsID(); // Atualiza o campo desabilitado na UI
                        // Atualiza a URL do navegador para incluir o ID 
                        window.history.replaceState({}, '', `?edit=${result.formId}`);
                        // Atualiza a variável global para que futuras edições usem PUT
                        formIdToEdit = result.formId; 
                    }
                    
                    saveBtn.style.backgroundColor = '#2ecc71';
                    saveBtn.querySelector('span').textContent = 'Salvo com Sucesso!';

                } catch (error) {
                    console.error("Erro ao salvar:", error);
                    showCustomAlert(`Falha ao salvar formulário: ${error.message}`,'error');
                    saveBtn.style.backgroundColor = '#e74c3c'; 
                    saveBtn.querySelector('span').textContent = 'Erro ao Salvar';
                } finally {
                    // Reabilita o botão e restaura o texto/ícone após um tempo
                    setTimeout(() => {
                        saveBtn.style.backgroundColor = '';
                        saveBtn.querySelector('span').innerHTML = originalSpanHTML; // Restaura HTML original
                        saveBtn.disabled = false;
                    }, 2500);
                }
            } 
            else if (metadataToggleBtn) {
                const content = document.getElementById('metadata-content');
                const btn = metadataToggleBtn.querySelector('.btn-toggle');
                content.classList.toggle('collapsed');
                btn.classList.toggle('collapsed');
            } 
            else if (removeBtn) {
                const cardToRemove = removeBtn.closest('.question-card');
                const index = parseInt(cardToRemove.dataset.index, 10);
                cardToRemove.remove(); // Remove do DOM
                formConfig.questions.splice(index, 1); // Remove do objeto
                if(previewCurrentStep >= formConfig.questions.length) { previewCurrentStep = Math.max(0, formConfig.questions.length - 1); }
                
                // Sincroniza título se necessário após remover
                if ((formConfig.questions.length === 1 && formConfig.formStyle === 'Standard') || formConfig.formStyle === 'Footer') {
                    if(formConfig.questions[0]) formConfig.questions[0].likertQuestion = formConfig.questions[0].title;
                }

                updateQuestionCardTitles(); // Apenas atualiza títulos e índices
                updateViews();
            } 
            else if (visibilityBtn) {
                const path = visibilityBtn.dataset.togglePath; const currentValue = getPropertyByPath(formConfig, path);
                updateState(path, !currentValue); // Atualiza o estado
                // Atualiza a UI diretamente
                visibilityBtn.innerHTML = !currentValue ? icons.eye : icons.eyeOff;
                visibilityBtn.closest('.toggle-group').nextElementSibling?.classList.toggle('hidden');
                updateViews(); // Atualiza preview e código
            } 
            else if (collapseBtn) {
                const card = collapseBtn.closest('.question-card');
                if (card) {
                    const content = card.querySelector('.collapsible-content.question-body'); // Mais específico
                    card.classList.toggle('collapsed');
                    content.classList.toggle('collapsed');
                    collapseBtn.classList.toggle('collapsed');
                }
            }
        });

        sidebar.dataset.listenersAttached = 'true';
    }


    function attachStandardPreviewListeners() {
        const form = previewWrapper.querySelector('#dashboard-survey');
        if (!form) return;
        form.querySelector('.btn-prev')?.addEventListener('click', () => navigatePreview(-1));
        form.querySelector('.btn-next')?.addEventListener('click', () => navigatePreview(1));
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validateStandardPreviewStep()) return;
            previewCurrentStep = formConfig.questions.length;
            renderPreviewStep();
            setTimeout(() => {
                previewCurrentStep = 0;
                previewData = {}; 
                renderStandardPreview();
            }, 2500);
        });
        form.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                previewData[e.target.name] = e.target.value;
                handleEvaluationSelectionInPreview(e);
            }
        });
        form.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                previewData[e.target.name] = e.target.value;
            }
        });
        form.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('.adjective-pills .pill, .priority-pills .pill')) {
                const key = target.classList.contains('priority-pill') ? `priority_${target.dataset.key}` : `tags_${target.dataset.key}`;
                const value = target.textContent;
                if (target.classList.contains('priority-pill')) { 
                    if (target.classList.contains('active')) {
                        target.classList.remove('active');
                        delete previewData[key];
                    } else {
                        target.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                        target.classList.add('active');
                        previewData[key] = value;
                    }
                } else { 
                    target.classList.toggle('active');
                    if (!previewData[key]) previewData[key] = [];
                    if (previewData[key].includes(value)) {
                        previewData[key] = previewData[key].filter(t => t !== value);
                    } else {
                        previewData[key].push(value);
                    }
                }
            }
        });
    }

    function attachFooterPreviewListeners() {
        const form = previewWrapper.querySelector('#footer-survey');
        if (!form) return;

        form.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                previewData[e.target.name] = e.target.value;
            }
        });
        form.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                previewData[e.target.name] = e.target.value;
            }
        });
        form.addEventListener('click', (e) => {
            if (e.target.matches('.category-pills .pill')) {
                const key = `tags_${e.target.dataset.key}`;
                if (!previewData[key]) previewData[key] = [];
                const tagValue = e.target.textContent;
                e.target.classList.toggle('active');
                if (previewData[key].includes(tagValue)) {
                    previewData[key] = previewData[key].filter(t => t !== tagValue);
                } else {
                    previewData[key].push(tagValue);
                }
            }
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const question = formConfig.questions[0];
            if (!question) return;
            if (question.showEvaluation !== false && question.evaluationType !== 'Backlog' && !form.querySelector(`input[name="eval_${question.key}"]:checked`)) {
                showCustomAlert('Por favor, selecione uma avaliação.','warning');
                return;
            }
            if (question.showTags === true && form.querySelectorAll('.category-pills .pill.active').length === 0) {
                showCustomAlert('Por favor, selecione pelo menos uma tag.','warning');
                return;
            }
            form.style.display = 'none';
            previewWrapper.querySelector('#thank-you-message-footer').style.display = 'block';
            setTimeout(() => {
                previewData = {}; 
                renderFooterPreview();
            }, 2500);
        });
    }

    function handleEvaluationSelectionInPreview(event) {
        const selectedRadio = event.target;
        const key = selectedRadio.name.replace('eval_', '');
        const questionConfig = formConfig.questions.find(q => q.key === key);
        if (!questionConfig || !questionConfig.showTags) return;
        const pillsContainer = selectedRadio.closest('.form-step').querySelector('.adjective-pills');
        if (!pillsContainer) return;

        let score;
        if (questionConfig.evaluationType === 'Likert') {
            score = likertScoreMap[selectedRadio.value];
        } else {
            score = parseInt(selectedRadio.value, 10);
        }

        let adjectivesToShow = [];
        if (questionConfig.evaluationType === 'NPS(0-10)') {
            if (score <= 6) adjectivesToShow = questionConfig.adjectives.negative;
            else if (score <= 8) adjectivesToShow = [...(questionConfig.adjectives.negative || []), ...(questionConfig.adjectives.positive || [])];
            else adjectivesToShow = questionConfig.adjectives.positive;
        } else {
            const maxScore = (questionConfig.evaluationType === 'NPS(0-5)') ? 5 : 5;
            const scoreThreshold = Math.ceil(maxScore / 2);
            if (score < scoreThreshold) adjectivesToShow = questionConfig.adjectives.negative;
            else if (score === scoreThreshold) adjectivesToShow = [...(questionConfig.adjectives.negative || []), ...(questionConfig.adjectives.positive || [])];
            else adjectivesToShow = questionConfig.adjectives.positive;
        }
        const activeTags = previewData[`tags_${key}`] || [];
        pillsContainer.innerHTML = adjectivesToShow.map(adj => `<div class="pill ${activeTags.includes(adj) ? 'active' : ''}" data-key="${key}">${adj}</div>`).join('');
    }

   if (formIdToEdit) {
        // Se há um ID na URL, carrega os dados primeiro
        await loadFormData(formIdToEdit); // Espera carregar os dados
        // As funções de renderização serão chamadas dentro de loadFormData
        const uiState = captureUIState(); // Captura estado (pode ter sido definido no load)
        renderSidebarContent(); // Renderiza a sidebar com os dados carregados
        applyUIState(uiState);  // Aplica estado (collapse)
        updateViews();          // Renderiza preview e code view
    } else {
        // Se não há ID, inicia com um formulário novo
        renderSidebarContent();
        updateViews();
        // Clica para adicionar a primeira pergunta apenas se for um formulário realmente novo
        if (formConfig.questions.length === 0) { 
            document.getElementById('addQuestion').click(); 
        }
    }
});