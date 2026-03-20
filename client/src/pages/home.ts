import { state, elements } from '../state';
import { initHost, initGuest, broadcast } from '../peer';
import { hostStartGame, hostResetGame } from '../hostLogic';
import { showToast, sanitizeInput, decodeInput } from '../ui/toast';
import { showConfirm, showPrompt } from '../ui/modal';
import { EVENTS } from '../../../shared/events';

export function initLobbyEvents() {
  // P2P Connection
  elements.lobby.roomCreateBtn.addEventListener('click', () => {
    initHost();
  });

  elements.lobby.roomJoinBtn.addEventListener('click', () => {
    const roomId = elements.lobby.roomJoinInput.value.trim();
    if (!roomId) {
      showToast('Room ID を入力してください');
      return;
    }
    initGuest(roomId);
  });

  // Preset actions
  elements.lobby.presetToggleBtn.addEventListener('click', () => {
    elements.lobby.presetMenu.classList.toggle('hidden');
  });

  elements.lobby.presetSaveBtn.addEventListener('click', async () => {
    elements.lobby.presetMenu.classList.add('hidden');
    if (state.role !== 'HOST') return;

    const name = await showPrompt('プリセット保存', '保存するプリセット名を入力してください。');
    if (name && name.trim()) {
      const newPreset = {
        id: crypto.randomUUID(),
        name: sanitizeInput(name),
        missions: state.missions,
        citizenRoles: state.citizenRoles,
        werewolfRoles: state.werewolfRoles,
        createdAt: Date.now()
      };
      state.presets.push(newPreset);
      renderLobby();
      broadcast(EVENTS.PRESET_LIST, { presets: state.presets });
      showToast('プリセットを保存しました', false);
    }
  });

  // Items Add (Mission)
  elements.lobby.missionAddBtn.addEventListener('click', () => {
    addItem('mission', elements.lobby.missionInput.value);
  });
  elements.lobby.missionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem('mission', elements.lobby.missionInput.value);
  });

  // Items Add (Citizen)
  elements.lobby.citizenAddBtn.addEventListener('click', () => {
    addItem('citizen', elements.lobby.citizenInput.value);
  });
  elements.lobby.citizenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem('citizen', elements.lobby.citizenInput.value);
  });

  // Items Add (Werewolf)
  elements.lobby.werewolfAddBtn.addEventListener('click', () => {
    addItem('werewolf', elements.lobby.werewolfInput.value);
  });
  elements.lobby.werewolfInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem('werewolf', elements.lobby.werewolfInput.value);
  });

  // Mission Public Toggle
  elements.lobby.missionPublicToggle.addEventListener('change', (e) => {
    if (state.role !== 'HOST') return;
    const target = e.target as HTMLInputElement;
    state.missionPublic = target.checked;
    saveToStorageAndRender();
  });

  // Game actions
  elements.lobby.gameStartBtn.addEventListener('click', () => {
    hostStartGame();
  });

  // Result -> LOBBY
  elements.result.resetBtn.addEventListener('click', () => {
    hostResetGame();
  });
}

type ListType = 'mission' | 'citizen' | 'werewolf';

function getListRef(type: ListType) {
  if (type === 'mission') return state.missions;
  if (type === 'citizen') return state.citizenRoles;
  return state.werewolfRoles;
}

function getInputRef(type: ListType) {
  if (type === 'mission') return elements.lobby.missionInput;
  if (type === 'citizen') return elements.lobby.citizenInput;
  return elements.lobby.werewolfInput;
}

function addItem(type: ListType, val: string) {
  if (state.role !== 'HOST') {
    showToast('ホストのみ設定を変更できます');
    return;
  }
  const t = val.trim();
  if (t) {
    const list = getListRef(type);
    list.push(sanitizeInput(t));
    saveToStorageAndRender();
    const input = getInputRef(type);
    input.value = '';
    input.focus();
  }
}

function removeItem(type: ListType, index: number) {
  if (state.role !== 'HOST') return;
  const list = getListRef(type);
  list.splice(index, 1);
  saveToStorageAndRender();
}

function editItem(type: ListType, index: number, val: string) {
  if (state.role !== 'HOST') return;
  const t = val.trim();
  if(t) {
    const list = getListRef(type);
    list[index] = sanitizeInput(t);
  }
  saveToStorageAndRender();
}

function saveToStorageAndRender() {
  localStorage.setItem('missions', JSON.stringify(state.missions));
  localStorage.setItem('citizenRoles', JSON.stringify(state.citizenRoles));
  localStorage.setItem('werewolfRoles', JSON.stringify(state.werewolfRoles));
  localStorage.setItem('missionPublic', String(state.missionPublic));
  renderLobby();
  if (state.role === 'HOST') {
    broadcast(EVENTS.SYNC_ITEMS_UPDATE, { 
      missions: state.missions, 
      citizenRoles: state.citizenRoles,
      werewolfRoles: state.werewolfRoles,
      missionPublic: state.missionPublic
    });
  }
}

export function renderLobby() {
  // Update header text
  let statusText = `👥 ${state.connectedCount}人参加中`;
  elements.lobby.connectionStatus.innerHTML = statusText;

  // Preset UI
  elements.lobby.presetList.innerHTML = '';
  state.presets.forEach(p => {
    const li = document.createElement('li');
    li.innerText = decodeInput(p.name);
    
    const actions = document.createElement('div');
    actions.className = 'preset-actions';
    
    const loadBtn = document.createElement('button');
    loadBtn.innerText = '[ロード]';
    loadBtn.onclick = async () => {
      elements.lobby.presetMenu.classList.add('hidden');
      if (state.role !== 'HOST') return;
      const confirm = await showConfirm('プリセットロード', '現在の設定を上書きします。よろしいですか？');
      if (confirm) {
        state.missions = p.missions;
        state.citizenRoles = p.citizenRoles || [];
        state.werewolfRoles = p.werewolfRoles || [];
        saveToStorageAndRender();
      }
    };

    const delBtn = document.createElement('button');
    delBtn.innerText = '[削除]';
    delBtn.onclick = () => {
      elements.lobby.presetMenu.classList.add('hidden');
      if (state.role !== 'HOST') return;
      state.presets = state.presets.filter(preset => preset.id !== p.id);
      renderLobby();
      broadcast(EVENTS.PRESET_LIST, { presets: state.presets });
    };

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    li.appendChild(actions);
    elements.lobby.presetList.appendChild(li);
  });

  // Draw Lists
  elements.lobby.missionCount.innerText = `[${state.missions.length}件]`;
  renderList(elements.lobby.missionList, state.missions, 
    (i) => removeItem('mission', i), 
    (i, v) => editItem('mission', i, v), 
    (newOrder) => { if (state.role === 'HOST') { state.missions = newOrder; saveToStorageAndRender(); } }
  );

  elements.lobby.citizenCountInfo.innerText = `[${state.citizenRoles.length}件]`;
  renderList(elements.lobby.citizenList, state.citizenRoles, 
    (i) => removeItem('citizen', i), 
    (i, v) => editItem('citizen', i, v), 
    (newOrder) => { if (state.role === 'HOST') { state.citizenRoles = newOrder; saveToStorageAndRender(); } }
  );

  elements.lobby.werewolfCountInfo.innerText = `[${state.werewolfRoles.length}件]`;
  renderList(elements.lobby.werewolfList, state.werewolfRoles, 
    (i) => removeItem('werewolf', i), 
    (i, v) => editItem('werewolf', i, v), 
    (newOrder) => { if (state.role === 'HOST') { state.werewolfRoles = newOrder; saveToStorageAndRender(); } }
  );

  // Update Input State
  const disabled = state.role !== 'HOST';
  elements.lobby.missionPublicToggle.disabled = disabled;
  elements.lobby.missionInput.disabled = disabled;
  elements.lobby.missionAddBtn.disabled = disabled;
  elements.lobby.citizenInput.disabled = disabled;
  elements.lobby.citizenAddBtn.disabled = disabled;
  elements.lobby.werewolfInput.disabled = disabled;
  elements.lobby.werewolfAddBtn.disabled = disabled;
  elements.lobby.missionPublicToggle.checked = state.missionPublic;

  const totalRoles = state.citizenRoles.length + state.werewolfRoles.length;
  elements.lobby.totalRoleCountInfo.innerText = `[合計 ${totalRoles}人設定中 / 現在 ${state.connectedCount}人接続中]`;

  // Actions
  if (state.role === 'HOST' && state.phase === 'LOBBY') {
    elements.lobby.gameStartBtn.classList.remove('hidden');
  } else {
    elements.lobby.gameStartBtn.classList.add('hidden');
  }

  // Hide P2P connection area if already connected
  const p2pContainer = document.querySelector('.p2p-connection-container') as HTMLElement;
  if (state.peerId) {
    if (p2pContainer) p2pContainer.classList.add('hidden');
  } else {
    if (p2pContainer) p2pContainer.classList.remove('hidden');
  }
}

// Helper for draggable list parsing
function renderList(
  container: HTMLUListElement, 
  items: string[], 
  onRemove: (idx: number) => void,
  onEdit: (idx: number, val: string) => void,
  onReorder: (newOrder: string[]) => void
) {
  container.innerHTML = '';
  
  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.draggable = state.role === 'HOST'; // only host can drag
    
    // Drag & Drop
    if (state.role === 'HOST') {
      li.addEventListener('dragstart', (e) => {
        if (e.dataTransfer) e.dataTransfer.setData('text/plain', index.toString());
        li.style.opacity = '0.5';
      });
      li.addEventListener('dragover', (e) => e.preventDefault());
      li.addEventListener('dragend', () => li.style.opacity = '1');
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
        if (fromIdx !== -1 && fromIdx !== index) {
          const newItems = [...items];
          const [moved] = newItems.splice(fromIdx, 1);
          newItems.splice(index, 0, moved);
          onReorder(newItems);
        }
      });
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'item-text';
    textSpan.innerText = decodeInput(item);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'item-edit-input';
    input.value = decodeInput(item);

    textSpan.addEventListener('dblclick', () => {
      if (state.role !== 'HOST') return;
      li.classList.add('editing');
      input.focus();
    });

    input.addEventListener('blur', () => onEdit(index, input.value));
    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') onEdit(index, input.value);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'item-delete-btn';
    delBtn.innerHTML = '×';
    if (state.role !== 'HOST') {
      delBtn.style.display = 'none';
      textSpan.style.cursor = 'default';
    }
    delBtn.onclick = () => onRemove(index);

    li.appendChild(textSpan);
    li.appendChild(input);
    li.appendChild(delBtn);
    container.appendChild(li);
  });
}
