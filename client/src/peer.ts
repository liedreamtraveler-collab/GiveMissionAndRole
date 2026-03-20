import { Peer, DataConnection } from 'peerjs';
import { state, elements } from './state';
import { EVENTS } from '../../shared/events';
import { showToast } from './ui/toast';
import { renderLobby } from './pages/home';
import { runLotteryAnimation } from './animation/lottery';
import { transitionTo } from './animation/transition';
import gsap from 'gsap';

export let peer: Peer | null = null;
export let hostConnection: DataConnection | null = null;
export const guestConnections: DataConnection[] = [];

// ホストとして部屋を作成
export function initHost() {
  peer = new Peer();

  peer.on('open', (id) => {
    state.peerId = id;
    state.hostPeerId = id;
    state.role = 'HOST';
    state.connectedCount = 1; // 自分を含む
    elements.common.roomIdDisplay.innerText = `Room ID: ${id}`;
    transitionTo('LOBBY');
    renderLobby();
    showToast('ルームを作成しました', false);
  });

  peer.on('connection', (conn) => {
    guestConnections.push(conn);
    state.connectedCount = guestConnections.length + 1; // ゲスト数 + 1(ホスト)
    renderLobby();

    conn.on('data', (payload: any) => {
      handleDataFromGuest(conn, payload);
    });

    conn.on('close', () => {
      const index = guestConnections.indexOf(conn);
      if (index > -1) guestConnections.splice(index, 1);
      state.connectedCount = guestConnections.length + 1;
      renderLobby();
    });

    // 接続直後に現状のステートを同期
    sendTo(conn, EVENTS.SYNC_ITEMS_UPDATE, {
      missions: state.missions,
      citizenRoles: state.citizenRoles,
      werewolfRoles: state.werewolfRoles,
      missionPublic: state.missionPublic
    });
    sendTo(conn, EVENTS.GAME_PHASE, { phase: state.phase });
  });

  peer.on('error', (err) => {
    showToast(`エラー: ${err.message}`, true);
  });
}

// ゲストとしてホストに接続
export function initGuest(hostId: string) {
  peer = new Peer();

  peer.on('open', (id) => {
    state.peerId = id;
    state.hostPeerId = hostId;
    state.role = 'GUEST';
    
    // ホストへ接続
    hostConnection = peer!.connect(hostId);

    hostConnection.on('open', () => {
      elements.common.roomIdDisplay.innerText = `Connected Room: ${hostId}`;
      transitionTo('LOBBY');
      renderLobby();
      showToast('ルームに参加しました', false);
    });

    hostConnection.on('data', (payload: any) => {
      handleDataFromHost(payload);
    });

    hostConnection.on('close', () => {
      showToast('ホストとの接続が切断されました', true);
      hostConnection = null;
    });
  });

  peer.on('error', (err) => {
    showToast(`エラー: ${err.message}`, true);
  });
}

// ホストから全ゲストへデータ送信
export function broadcast(type: string, data?: any) {
  const payload = { type, ...data };
  guestConnections.forEach(conn => {
    if (conn.open) {
      conn.send(payload);
    }
  });
}

// 特定のゲストへデータ送信
export function sendTo(conn: DataConnection, type: string, data?: any) {
  if (conn.open) {
    conn.send({ type, ...data });
  }
}

// ゲストからホストへデータ送信
export function sendToHost(type: string, data?: any) {
  if (hostConnection && hostConnection.open) {
    hostConnection.send({ type, ...data });
  }
}

// ホストがゲストからのメッセージを処理
function handleDataFromGuest(_conn: DataConnection, _payload: any) {
  // 基本的にゲストからはゲーム設定等の送信はないが、
  // もしあればここに記述する
}

// ゲストがホストからのメッセージを処理
function handleDataFromHost(payload: any) {
  switch (payload.type) {
    case EVENTS.SYNC_ITEMS_UPDATE:
      state.missions = payload.missions;
      state.citizenRoles = payload.citizenRoles;
      state.werewolfRoles = payload.werewolfRoles;
      state.missionPublic = payload.missionPublic;
      localStorage.setItem('missions', JSON.stringify(state.missions));
      localStorage.setItem('citizenRoles', JSON.stringify(state.citizenRoles));
      localStorage.setItem('werewolfRoles', JSON.stringify(state.werewolfRoles));
      localStorage.setItem('missionPublic', String(state.missionPublic));
      if (state.phase === 'LOBBY') renderLobby();
      break;

    case EVENTS.GAME_PHASE:
      if (payload.phase === 'LOBBY' && state.phase !== 'LOBBY') {
        // リセット
        state.selectedMission = null;
        state.assignedRole = null;
        state.phase = 'LOBBY';
        transitionTo('LOBBY');
        renderLobby();
        gsap.set(['#game-start-btn', '.mission-box-container', '.role-box-container'], {
          scale: 1, opacity: 1, y: 0
        });
      } else {
        state.phase = payload.phase;
      }
      break;

    case EVENTS.LOTTERY_START:
      runLotteryAnimation();
      break;

    case EVENTS.LOTTERY_MISSION:
      state.selectedMission = payload.mission;
      break;

    case EVENTS.LOTTERY_ROLE:
      state.assignedRole = payload.role;
      break;

    case EVENTS.LOTTERY_NO_ROLE:
      state.assignedRole = null;
      break;
      
    case EVENTS.GAME_ERROR:
      showToast(payload.message, true);
      break;
  }
}
