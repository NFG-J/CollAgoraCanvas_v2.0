(function () {
  const STORAGE_KEY = 'collagoraCanvas.v1.project';

  const builtInTemplates = [
    {
      templateId: 'blank',
      title: 'Blank canvas',
      description: 'Open workspace without predefined sections.',
      canvas: { width: 1400, height: 900 },
      sections: []
    },
    {
      templateId: 'business-model-canvas',
      title: 'Business Model Canvas',
      description: 'Nine-section business-model structure inspired by Osterwalder.',
      canvas: { width: 1800, height: 1100 },
      sections: [
        { id: 'key-partners', title: 'Key partners', x: 20, y: 20, width: 330, height: 520 },
        { id: 'key-activities', title: 'Key activities', x: 370, y: 20, width: 330, height: 250 },
        { id: 'key-resources', title: 'Key resources', x: 370, y: 290, width: 330, height: 250 },
        { id: 'value-propositions', title: 'Value propositions', x: 720, y: 20, width: 360, height: 520 },
        { id: 'customer-relationships', title: 'Customer relationships', x: 1100, y: 20, width: 330, height: 250 },
        { id: 'channels', title: 'Channels', x: 1100, y: 290, width: 330, height: 250 },
        { id: 'customer-segments', title: 'Customer segments', x: 1450, y: 20, width: 330, height: 520 },
        { id: 'cost-structure', title: 'Cost structure', x: 20, y: 570, width: 860, height: 250 },
        { id: 'revenue-streams', title: 'Revenue streams', x: 920, y: 570, width: 860, height: 250 }
      ]
    },
    {
      templateId: 'lean-canvas',
      title: 'Lean Canvas',
      description: 'Problem-solution-market canvas for early-stage ideas.',
      canvas: { width: 1800, height: 1100 },
      sections: [
        { id: 'problem', title: 'Problem', x: 20, y: 20, width: 340, height: 360 },
        { id: 'solution', title: 'Solution', x: 380, y: 20, width: 340, height: 170 },
        { id: 'key-metrics', title: 'Key metrics', x: 380, y: 210, width: 340, height: 170 },
        { id: 'unique-value-proposition', title: 'Unique value proposition', x: 740, y: 20, width: 340, height: 360 },
        { id: 'unfair-advantage', title: 'Unfair advantage', x: 1100, y: 20, width: 340, height: 170 },
        { id: 'channels', title: 'Channels', x: 1100, y: 210, width: 340, height: 170 },
        { id: 'customer-segments', title: 'Customer segments', x: 1460, y: 20, width: 320, height: 360 },
        { id: 'cost-structure', title: 'Cost structure', x: 20, y: 410, width: 860, height: 260 },
        { id: 'revenue-streams', title: 'Revenue streams', x: 920, y: 410, width: 860, height: 260 }
      ]
    },
    {
      templateId: 'tbl-co-creation',
      title: 'Triple Bottom Line Co-creation Canvas',
      description: 'Educational canvas for sustainable co-creation and ecosystem learning.',
      canvas: { width: 1800, height: 1200 },
      sections: [
        { id: 'participants', title: 'Participants / ecosystem actors', x: 20, y: 20, width: 430, height: 260 },
        { id: 'shared-challenge', title: 'Shared challenge', x: 470, y: 20, width: 430, height: 260 },
        { id: 'value-proposal', title: 'Co-created value proposal', x: 920, y: 20, width: 430, height: 260 },
        { id: 'governance', title: 'Governance and responsibilities', x: 1370, y: 20, width: 410, height: 260 },
        { id: 'people', title: 'People / social effects', x: 20, y: 310, width: 570, height: 300 },
        { id: 'planet', title: 'Planet / environmental effects', x: 615, y: 310, width: 570, height: 300 },
        { id: 'profit', title: 'Profit / viability effects', x: 1210, y: 310, width: 570, height: 300 },
        { id: 'experiments', title: 'Experiments and learning', x: 20, y: 640, width: 860, height: 300 },
        { id: 'evidence', title: 'Evidence, metrics and next steps', x: 920, y: 640, width: 860, height: 300 }
      ]
    }
  ];

  const state = {
    projectVersion: '1.0',
    projectTitle: 'Untitled CollAgora Canvas',
    templateId: 'blank',
    canvas: { width: 1400, height: 900 },
    sections: [],
    items: [],
    selectedItemId: null
  };

  const dom = {};

  const MIN_ITEM_WIDTH = 150;
  const MIN_ITEM_HEIGHT = 90;
  const MIN_SECTION_WIDTH = 160;
  const MIN_SECTION_HEIGHT = 110;

  const history = { stack: [], index: -1, max: 50, suppress: false };

  const aiPromptTemplates = {
    'theme-gap': 'You are helping us analyse a completed CollAgora Canvas. Group the ideas by theme, identify overlaps, suggest missing perspectives, and propose the three most realistic next experiments. Use vote scores, but do not rely only on them.',
    prioritisation: 'You are a facilitator reviewing a completed CollAgora Canvas. Rank the highest-voted ideas, flag any high-vote items that seem risky or unclear, and propose a short action plan for the next two weeks.',
    'stakeholder-summary': 'You are preparing a one-page summary of a workshop CollAgora Canvas for stakeholders who were not present. Write a concise narrative overview per section, highlight the top three ideas by vote score, and note any open questions.'
  };

  const share = { socket: null, connected: false, suppressSend: false, sendTimer: null };

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clampVote(value) {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) return 3;
    return Math.min(5, Math.max(1, number));
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
  }

  // --- Undo / redo history -------------------------------------------------

  function snapshotState() {
    return JSON.stringify({
      projectTitle: state.projectTitle,
      templateId: state.templateId,
      canvas: state.canvas,
      sections: state.sections,
      items: state.items
    });
  }

  function updateHistoryButtons() {
    if (!dom.undoBtn || !dom.redoBtn) return;
    dom.undoBtn.disabled = history.index <= 0;
    dom.redoBtn.disabled = history.index >= history.stack.length - 1;
  }

  function pushHistory() {
    if (history.suppress) return;
    const snap = snapshotState();
    if (history.stack[history.index] === snap) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(snap);
    if (history.stack.length > history.max) history.stack.shift();
    history.index = history.stack.length - 1;
    updateHistoryButtons();
    broadcastProjectUpdate();
  }

  function resetHistory() {
    history.stack = [];
    history.index = -1;
    pushHistory();
  }

  function restoreSnapshot(snap) {
    const data = JSON.parse(snap);
    history.suppress = true;
    state.projectTitle = data.projectTitle;
    state.templateId = data.templateId;
    state.canvas = data.canvas;
    state.sections = data.sections;
    state.items = data.items;
    state.selectedItemId = null;
    render();
    history.suppress = false;
    updateHistoryButtons();
    broadcastProjectUpdate();
  }

  function undo() {
    if (history.index <= 0) return;
    history.index -= 1;
    restoreSnapshot(history.stack[history.index]);
  }

  function redo() {
    if (history.index >= history.stack.length - 1) return;
    history.index += 1;
    restoreSnapshot(history.stack[history.index]);
  }

  // --- Optional shared-workshop sync ---------------------------------------

  function broadcastProjectUpdate() {
    if (!share.connected || !share.socket || share.suppressSend) return;
    clearTimeout(share.sendTimer);
    share.sendTimer = setTimeout(() => {
      try {
        share.socket.send(JSON.stringify({ type: 'update', project: serializeProject() }));
      } catch (error) {
        /* ignore transient send errors */
      }
    }, 250);
  }

  function setShareStatus(text) {
    if (dom.shareStatus) dom.shareStatus.textContent = text;
  }

  function connectShare() {
    if (typeof window === 'undefined' || !window.WebSocket) {
      setShareStatus('WebSocket is not available in this browser.');
      return;
    }
    const url = (dom.shareServerUrl.value || '').trim();
    const room = (dom.shareRoomCode.value || 'workshop').trim() || 'workshop';
    if (!url) {
      setShareStatus('Enter a server URL first.');
      return;
    }
    try {
      const socket = new window.WebSocket(`${url.replace(/\/$/, '')}/ws?room=${encodeURIComponent(room)}`);
      share.socket = socket;
      setShareStatus('Connecting...');
      socket.addEventListener('open', () => {
        share.connected = true;
        setShareStatus(`Connected to room "${room}".`);
        dom.shareConnectBtn.disabled = true;
        dom.shareDisconnectBtn.disabled = false;
        socket.send(JSON.stringify({ type: 'update', project: serializeProject() }));
      });
      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          if ((message.type === 'update' || message.type === 'sync') && message.project) {
            share.suppressSend = true;
            loadProject(message.project);
            pushHistory();
            share.suppressSend = false;
          }
        } catch (error) {
          /* ignore malformed messages */
        }
      });
      socket.addEventListener('close', () => {
        share.connected = false;
        share.socket = null;
        dom.shareConnectBtn.disabled = false;
        dom.shareDisconnectBtn.disabled = true;
        setShareStatus('Disconnected.');
      });
      socket.addEventListener('error', () => {
        setShareStatus('Connection error. Is the optional server running?');
      });
    } catch (error) {
      setShareStatus(`Could not connect: ${error.message}`);
    }
  }

  function disconnectShare() {
    if (share.socket) share.socket.close();
    share.connected = false;
    share.socket = null;
    dom.shareConnectBtn.disabled = false;
    dom.shareDisconnectBtn.disabled = true;
    setShareStatus('Not connected.');
  }

  // --- AI prompt helper -----------------------------------------------------

  function composeAiPrompt(templateKey, format, data) {
    const instructions = aiPromptTemplates[templateKey] || aiPromptTemplates['theme-gap'];
    const fence = format === 'json' ? 'json' : 'markdown';
    return `${instructions}\n\nHere is the CollAgora Canvas export (${format.toUpperCase()}):\n\n\`\`\`${fence}\n${data}\n\`\`\``;
  }

  function buildAiPrompt(templateKey, format) {
    const data = format === 'json' ? JSON.stringify(serializeProject(), null, 2) : markdownExport();
    return composeAiPrompt(templateKey, format, data);
  }

  async function copyAiPrompt() {
    const templateKey = dom.aiPromptSelect.value;
    const format = dom.aiFormatSelect.value;
    const prompt = buildAiPrompt(templateKey, format);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt);
        dom.aiPromptStatus.textContent = 'Prompt copied to clipboard.';
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (error) {
      downloadText('collagora-ai-prompt.txt', prompt, 'text/plain');
      dom.aiPromptStatus.textContent = 'Clipboard unavailable, downloaded prompt as a text file instead.';
    }
  }

  function currentTimestamp() {
    return new Date().toISOString();
  }

  function sectionForPoint(x, y) {
    return state.sections.find((section) => (
      x >= section.x && x <= section.x + section.width && y >= section.y && y <= section.y + section.height
    ));
  }

  function renderTemplateOptions() {
    dom.templateSelect.innerHTML = '';
    builtInTemplates.forEach((template) => {
      const option = document.createElement('option');
      option.value = template.templateId;
      option.textContent = template.title;
      dom.templateSelect.appendChild(option);
    });
    dom.templateSelect.value = state.templateId;
  }

  function applyTemplate(templateId) {
    const template = builtInTemplates.find((candidate) => candidate.templateId === templateId) || builtInTemplates[0];
    state.templateId = template.templateId;
    state.canvas = { ...template.canvas };
    state.sections = template.sections.map((section) => ({ ...section }));
    state.items = [];
    state.selectedItemId = null;
    dom.canvasSize.value = `${state.canvas.width}x${state.canvas.height}`;
    render();
    resetHistory();
  }

  function setCanvasSize(value) {
    const [width, height] = value.split('x').map((part) => Number.parseInt(part, 10));
    if (width && height) {
      state.canvas.width = width;
      state.canvas.height = height;
      render();
      pushHistory();
    }
  }

  function createNote(x = 80, y = 80, text = 'New idea') {
    const section = sectionForPoint(x, y);
    const item = {
      id: uid('note'),
      type: 'sticky-note',
      text,
      x,
      y,
      width: 190,
      height: 130,
      color: '#fff7a8',
      votes: 3,
      sectionId: section ? section.id : null,
      tags: []
    };
    state.items.push(item);
    state.selectedItemId = item.id;
    render();
    pushHistory();
    return item;
  }

  function createLinkCard(url, altText, x = 100, y = 100) {
    const section = sectionForPoint(x, y);
    const item = {
      id: uid('link'),
      type: 'link-card',
      text: url,
      url,
      altText,
      x,
      y,
      width: 230,
      height: 120,
      votes: 3,
      sectionId: section ? section.id : null,
      tags: []
    };
    state.items.push(item);
    state.selectedItemId = item.id;
    render();
    pushHistory();
    return item;
  }

  function createImageCard(src, altText, x = 120, y = 120) {
    const section = sectionForPoint(x, y);
    const item = {
      id: uid('image'),
      type: 'image-card',
      src,
      altText,
      x,
      y,
      width: 260,
      height: 230,
      votes: 3,
      sectionId: section ? section.id : null,
      tags: []
    };
    state.items.push(item);
    state.selectedItemId = item.id;
    render();
    pushHistory();
    return item;
  }

  function duplicateSelected() {
    const item = state.items.find((candidate) => candidate.id === state.selectedItemId);
    if (!item) return;
    const copy = { ...item, id: uid(item.type), x: item.x + 28, y: item.y + 28 };
    state.items.push(copy);
    state.selectedItemId = copy.id;
    render();
    pushHistory();
  }

  function deleteSelected() {
    if (!state.selectedItemId) return;
    state.items = state.items.filter((item) => item.id !== state.selectedItemId);
    state.selectedItemId = null;
    render();
    pushHistory();
  }

  function addSection() {
    const title = window.prompt('Section title?', 'New section');
    if (!title) return;
    const section = {
      id: uid('section'),
      title,
      x: 60,
      y: 60,
      width: 360,
      height: 240
    };
    state.sections.push(section);
    render();
    pushHistory();
  }

  function makeDraggable(element, item) {
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let isDragging = false;

    element.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[contenteditable="true"]') || event.target.tagName === 'A' || event.target.classList.contains('resize-handle')) return;
      event.preventDefault();
      state.selectedItemId = item.id;
      renderSelectionOnly();
      startX = event.clientX;
      startY = event.clientY;
      originX = item.x;
      originY = item.y;
      isDragging = true;
      element.setPointerCapture(event.pointerId);
    });

    element.addEventListener('pointermove', (event) => {
      if (!isDragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      item.x = Math.max(0, Math.min(state.canvas.width - 60, originX + dx));
      item.y = Math.max(0, Math.min(state.canvas.height - 40, originY + dy));
      element.style.left = `${item.x}px`;
      element.style.top = `${item.y}px`;
    });

    element.addEventListener('pointerup', (event) => {
      if (!isDragging) return;
      isDragging = false;
      const section = sectionForPoint(item.x, item.y);
      item.sectionId = section ? section.id : null;
      element.releasePointerCapture(event.pointerId);
      pushHistory();
    });
  }

  function makeResizable(handle, element, box, options = {}) {
    const minWidth = options.minWidth || MIN_ITEM_WIDTH;
    const minHeight = options.minHeight || MIN_ITEM_HEIGHT;
    let startX = 0;
    let startY = 0;
    let originWidth = 0;
    let originHeight = 0;
    let isResizing = false;

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      startX = event.clientX;
      startY = event.clientY;
      originWidth = box.width;
      originHeight = box.height;
      isResizing = true;
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener('pointermove', (event) => {
      if (!isResizing) return;
      event.stopPropagation();
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      box.width = Math.max(minWidth, Math.min(state.canvas.width - box.x, originWidth + dx));
      box.height = Math.max(minHeight, Math.min(state.canvas.height - box.y, originHeight + dy));
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.style.minHeight = `${box.height}px`;
    });

    handle.addEventListener('pointerup', (event) => {
      if (!isResizing) return;
      isResizing = false;
      event.stopPropagation();
      handle.releasePointerCapture(event.pointerId);
      pushHistory();
    });
  }

  function renderSections() {
    state.sections.forEach((section) => {
      const el = document.createElement('section');
      el.className = 'template-section';
      el.dataset.sectionId = section.id;
      el.style.left = `${section.x}px`;
      el.style.top = `${section.y}px`;
      el.style.width = `${section.width}px`;
      el.style.height = `${section.height}px`;
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      el.appendChild(heading);
      const handle = document.createElement('span');
      handle.className = 'resize-handle';
      handle.setAttribute('aria-hidden', 'true');
      el.appendChild(handle);
      makeResizable(handle, el, section, { minWidth: MIN_SECTION_WIDTH, minHeight: MIN_SECTION_HEIGHT });
      dom.canvas.appendChild(el);
    });
  }

  function renderItem(item) {
    let el;
    item.width = item.width || (item.type === 'image-card' ? 260 : item.type === 'link-card' ? 230 : 190);
    item.height = item.height || (item.type === 'image-card' ? 230 : item.type === 'link-card' ? 120 : 130);
    if (item.type === 'sticky-note') {
      el = document.getElementById('noteTemplate').content.firstElementChild.cloneNode(true);
      const content = el.querySelector('.item-content');
      content.textContent = item.text || '';
      content.addEventListener('input', (event) => {
        item.text = event.target.textContent;
      });
      content.addEventListener('blur', () => pushHistory());
      el.style.backgroundColor = item.color || '#fff7a8';
    } else if (item.type === 'link-card') {
      el = document.getElementById('cardTemplate').content.firstElementChild.cloneNode(true);
      const link = el.querySelector('.item-link');
      link.href = item.url;
      link.textContent = item.url;
      el.querySelector('.item-alt').textContent = item.altText || '';
    } else if (item.type === 'image-card') {
      el = document.createElement('article');
      el.className = 'canvas-item image-card';
      el.tabIndex = 0;
      el.innerHTML = `<div class="item-actions"><span class="item-score"></span></div><img><p class="item-alt"></p><span class="resize-handle" aria-hidden="true"></span>`;
      const image = el.querySelector('img');
      image.src = item.src;
      image.alt = item.altText || '';
      el.querySelector('.item-alt').textContent = item.altText || '';
    }

    el.dataset.itemId = item.id;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.width = `${item.width}px`;
    el.style.minHeight = `${item.height}px`;
    el.style.height = `${item.height}px`;
    el.querySelector('.item-score').textContent = clampVote(item.votes);
    el.classList.toggle('selected', item.id === state.selectedItemId);
    el.addEventListener('click', () => {
      state.selectedItemId = item.id;
      renderSelectionOnly();
      updateInspector();
    });
    makeDraggable(el, item);
    const handle = el.querySelector('.resize-handle');
    if (handle) makeResizable(handle, el, item);
    dom.canvas.appendChild(el);
  }

  function renderSelectionOnly() {
    dom.canvas.querySelectorAll('.canvas-item').forEach((el) => {
      el.classList.toggle('selected', el.dataset.itemId === state.selectedItemId);
    });
  }

  function updateInspector() {
    const item = state.items.find((candidate) => candidate.id === state.selectedItemId);
    dom.duplicateItemBtn.disabled = !item;
    dom.deleteItemBtn.disabled = !item;
    dom.voteInput.disabled = !item;
    dom.colorInput.disabled = !item || item.type !== 'sticky-note';
    if (!item) {
      dom.selectedInfo.textContent = 'No item selected.';
      return;
    }
    const section = state.sections.find((candidate) => candidate.id === item.sectionId);
    dom.selectedInfo.textContent = `${item.type.replace('-', ' ')}${section ? ` in ${section.title}` : ''}`;
    dom.voteInput.value = clampVote(item.votes);
    if (item.type === 'sticky-note') dom.colorInput.value = item.color || '#fff7a8';
  }

  function render() {
    dom.canvas.innerHTML = '';
    dom.canvas.style.width = `${state.canvas.width}px`;
    dom.canvas.style.height = `${state.canvas.height}px`;
    dom.projectTitle.value = state.projectTitle;
    dom.templateSelect.value = state.templateId;
    renderSections();
    state.items.forEach(renderItem);
    updateInspector();
  }

  function serializeProject() {
    return {
      projectVersion: '1.0',
      projectTitle: dom.projectTitle.value || state.projectTitle,
      updatedAt: currentTimestamp(),
      templateId: state.templateId,
      canvas: { ...state.canvas },
      sections: state.sections.map((section) => ({ ...section })),
      items: state.items.map((item) => ({ ...item }))
    };
  }

  function loadProject(project) {
    state.projectVersion = project.projectVersion || '1.0';
    state.projectTitle = project.projectTitle || 'Untitled CollAgora Canvas';
    state.templateId = project.templateId || 'blank';
    state.canvas = project.canvas || { width: 1400, height: 900 };
    state.sections = (project.sections || []).map((section) => ({ ...section }));
    state.items = (project.items || []).map((item) => ({ ...item, votes: clampVote(item.votes) }));
    state.selectedItemId = null;
    const size = `${state.canvas.width}x${state.canvas.height}`;
    if ([...dom.canvasSize.options].some((option) => option.value === size)) dom.canvasSize.value = size;
    render();
  }

  function saveLocal() {
    state.projectTitle = dom.projectTitle.value || state.projectTitle;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeProject(), null, 2));
    window.alert('Saved locally in this browser.');
  }

  function loadLocal() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.alert('No local CollAgora Canvas project found.');
      return;
    }
    loadProject(JSON.parse(stored));
    resetHistory();
  }

  function exportJson() {
    downloadText('collagora-canvas-project.json', JSON.stringify(serializeProject(), null, 2), 'application/json');
  }

  function exportTemplate() {
    const template = {
      templateId: state.templateId.startsWith('custom') ? state.templateId : `custom-${Date.now()}`,
      title: `${dom.projectTitle.value || 'Custom'} template`,
      description: 'Exported from CollAgora Canvas v1.0 template studio.',
      canvas: { ...state.canvas },
      sections: state.sections.map((section) => ({ ...section }))
    };
    downloadText('collagora-template.json', JSON.stringify(template, null, 2), 'application/json');
  }

  function markdownExport() {
    const project = serializeProject();
    const lines = [`# ${project.projectTitle}`, '', `Template: ${project.templateId}`, `Exported: ${project.updatedAt}`, ''];
    const unsectioned = [];
    project.sections.forEach((section) => {
      lines.push(`## ${section.title}`, '');
      const items = project.items.filter((item) => item.sectionId === section.id).sort((a, b) => clampVote(b.votes) - clampVote(a.votes));
      if (!items.length) lines.push('_No items._');
      items.forEach((item) => lines.push(formatMarkdownItem(item)));
      lines.push('');
    });
    project.items.filter((item) => !item.sectionId).forEach((item) => unsectioned.push(item));
    if (unsectioned.length) {
      lines.push('## Outside sections', '');
      unsectioned.sort((a, b) => clampVote(b.votes) - clampVote(a.votes)).forEach((item) => lines.push(formatMarkdownItem(item)));
    }
    return lines.join('\n');
  }

  function formatMarkdownItem(item) {
    if (item.type === 'sticky-note') return `- [${clampVote(item.votes)}/5] ${item.text || '(empty note)'}`;
    if (item.type === 'link-card') return `- [${clampVote(item.votes)}/5] ${item.url} - ${item.altText || 'No description'}`;
    if (item.type === 'image-card') return `- [${clampVote(item.votes)}/5] Image - alt text: ${item.altText || 'Missing alt text'}`;
    return `- [${clampVote(item.votes)}/5] ${item.type}`;
  }

  async function exportPng() {
    if (!window.html2canvas) {
      window.alert('PNG export needs the html2canvas library bundled in vendor/html2canvas.min.js.');
      return;
    }
    const canvasImage = await window.html2canvas(dom.canvas, { backgroundColor: '#ffffff', scale: 1 });
    const link = document.createElement('a');
    link.download = 'collagora-canvas.png';
    link.href = canvasImage.toDataURL('image/png');
    link.click();
  }

  async function exportPdf() {
    if (!window.html2canvas) {
      window.alert('PDF export needs the html2canvas library bundled in vendor/html2canvas.min.js.');
      return;
    }
    const jsPdfCtor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPdfCtor) {
      window.alert('PDF export needs the jsPDF library bundled in vendor/jspdf.umd.min.js.');
      return;
    }
    const canvasImage = await window.html2canvas(dom.canvas, { backgroundColor: '#ffffff', scale: 1 });
    const imageData = canvasImage.toDataURL('image/png');
    const orientation = canvasImage.width >= canvasImage.height ? 'landscape' : 'portrait';
    const doc = new jsPdfCtor({ orientation, unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const scale = Math.min(availableWidth / canvasImage.width, availableHeight / canvasImage.height);
    const renderWidth = canvasImage.width * scale;
    const renderHeight = canvasImage.height * scale;
    const offsetX = margin + (availableWidth - renderWidth) / 2;
    const offsetY = margin + (availableHeight - renderHeight) / 2;
    doc.setFontSize(14);
    doc.text(state.projectTitle || 'CollAgora Canvas', margin, margin);
    doc.addImage(imageData, 'PNG', offsetX, offsetY + 10, renderWidth, renderHeight - 10);
    doc.save('collagora-canvas.pdf');
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.sections && json.canvas && !json.items) {
          builtInTemplates.push(json);
          renderTemplateOptions();
          state.templateId = json.templateId;
          state.canvas = json.canvas;
          state.sections = json.sections;
          state.items = [];
          render();
          resetHistory();
        } else {
          loadProject(json);
          resetHistory();
        }
      } catch (error) {
        window.alert(`Could not import JSON: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    dom.projectTitle.addEventListener('input', (event) => { state.projectTitle = event.target.value; });
    dom.templateSelect.addEventListener('change', (event) => applyTemplate(event.target.value));
    dom.canvasSize.addEventListener('change', (event) => setCanvasSize(event.target.value));
    dom.addNoteBtn.addEventListener('click', () => createNote());
    dom.addLinkBtn.addEventListener('click', () => {
      const url = window.prompt('Paste link or video URL');
      if (!url) return;
      const altText = window.prompt('Short description / alt text for the link', 'Link related to this idea') || '';
      createLinkCard(url, altText);
    });
    dom.imageUpload.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const altText = window.prompt('Short alt text / description for the image');
      if (!altText) {
        window.alert('Image was not added. Alt text is required in CollAgora Canvas v1.0.');
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (readerEvent) => createImageCard(readerEvent.target.result, altText);
      reader.readAsDataURL(file);
      event.target.value = '';
    });
    dom.saveLocalBtn.addEventListener('click', saveLocal);
    dom.loadLocalBtn.addEventListener('click', loadLocal);
    dom.clearCanvasBtn.addEventListener('click', () => {
      if (window.confirm('Clear all canvas items? The template will remain.')) {
        state.items = [];
        state.selectedItemId = null;
        render();
        pushHistory();
      }
    });
    dom.exportJsonBtn.addEventListener('click', exportJson);
    dom.exportMarkdownBtn.addEventListener('click', () => downloadText('collagora-canvas.md', markdownExport(), 'text/markdown'));
    dom.exportPngBtn.addEventListener('click', exportPng);
    dom.exportPdfBtn.addEventListener('click', exportPdf);
    dom.importJsonInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) importJsonFile(file);
      event.target.value = '';
    });
    dom.voteInput.addEventListener('input', (event) => {
      const item = state.items.find((candidate) => candidate.id === state.selectedItemId);
      if (!item) return;
      item.votes = clampVote(event.target.value);
      render();
    });
    dom.voteInput.addEventListener('change', () => pushHistory());
    dom.colorInput.addEventListener('input', (event) => {
      const item = state.items.find((candidate) => candidate.id === state.selectedItemId);
      if (!item || item.type !== 'sticky-note') return;
      item.color = event.target.value;
      render();
    });
    dom.colorInput.addEventListener('change', () => pushHistory());
    dom.duplicateItemBtn.addEventListener('click', duplicateSelected);
    dom.deleteItemBtn.addEventListener('click', deleteSelected);
    dom.addSectionBtn.addEventListener('click', addSection);
    dom.exportTemplateBtn.addEventListener('click', exportTemplate);
    dom.undoBtn.addEventListener('click', undo);
    dom.redoBtn.addEventListener('click', redo);
    dom.copyAiPromptBtn.addEventListener('click', copyAiPrompt);
    dom.shareConnectBtn.addEventListener('click', connectShare);
    dom.shareDisconnectBtn.addEventListener('click', disconnectShare);
    document.addEventListener('keydown', (event) => {
      const metaOrCtrl = event.ctrlKey || event.metaKey;
      if (!metaOrCtrl) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    });
    dom.canvas.addEventListener('dblclick', (event) => {
      if (event.target !== dom.canvas) return;
      const rect = dom.canvas.getBoundingClientRect();
      createNote(event.clientX - rect.left, event.clientY - rect.top);
    });
  }

  function initDom() {
    [
      'projectTitle', 'templateSelect', 'canvasSize', 'canvas', 'addNoteBtn', 'addLinkBtn', 'imageUpload',
      'saveLocalBtn', 'loadLocalBtn', 'clearCanvasBtn', 'exportJsonBtn', 'exportMarkdownBtn', 'exportPngBtn',
      'exportPdfBtn', 'importJsonInput', 'voteInput', 'colorInput', 'duplicateItemBtn', 'deleteItemBtn',
      'selectedInfo', 'addSectionBtn', 'exportTemplateBtn', 'undoBtn', 'redoBtn', 'aiPromptSelect',
      'aiFormatSelect', 'copyAiPromptBtn', 'aiPromptStatus', 'shareServerUrl', 'shareRoomCode',
      'shareConnectBtn', 'shareDisconnectBtn', 'shareStatus'
    ].forEach((id) => {
      dom[id] = document.getElementById(id);
    });
  }

  function init() {
    initDom();
    renderTemplateOptions();
    bindEvents();
    applyTemplate('blank');
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  if (typeof module !== 'undefined') {
    module.exports = { clampVote, formatMarkdownItem, builtInTemplates, composeAiPrompt };
  }
})();
