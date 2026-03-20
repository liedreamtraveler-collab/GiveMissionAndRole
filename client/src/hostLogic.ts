import { state } from './state';
import { guestConnections, broadcast, sendTo } from './peer';
import { EVENTS } from '../../shared/events';
import { showToast } from './ui/toast';
import { runLotteryAnimation } from './animation/lottery';
import { DataConnection } from 'peerjs';

export function hostStartGame() {
  if (state.role !== 'HOST') {
    showToast('ホスト権限がありません', true);
    return;
  }

  const missions = state.missions;
  const cRoles = state.citizenRoles;
  const wRoles = state.werewolfRoles;
  
  const totalRoles = cRoles.length + wRoles.length;
  const connectedPlayersCount = guestConnections.length + 1; // ゲスト +自分

  // バリデーション
  if (missions.length === 0) {
    showToast('ミッションを1つ以上登録してください', true);
    return;
  }
  if (totalRoles === 0) {
    showToast('CitizenかWerewolfのロールを1つ以上登録してください', true);
    return;
  }
  if (totalRoles < connectedPlayersCount) {
    showToast(`ロール数が ${connectedPlayersCount - totalRoles} 個足りません`, true);
    return;
  }
  if (totalRoles > connectedPlayersCount) {
    showToast(`ロール数が ${totalRoles - connectedPlayersCount} 個多すぎます`, true);
    return;
  }

  state.phase = 'LOTTERY';
  broadcast(EVENTS.GAME_PHASE, { phase: 'LOTTERY' });

  // 1. ミッションをランダムに1つ選択
  const mission = missions[Math.floor(Math.random() * missions.length)];
  state.selectedMission = mission;

  // 2. ロール配列を生成してシャッフル (情報としてタイプを付与)
  const rawRoles = [
    ...wRoles.map(r => ({ name: r, type: 'werewolf' })),
    ...cRoles.map(r => ({ name: r, type: 'citizen' }))
  ];
  const shuffledRoles = [...rawRoles];
  for (let i = shuffledRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
  }

  // 3. 参加者（自分＋ゲスト）を配列化してシャッフル
  const participants: (DataConnection | 'SELF')[] = ['SELF', ...guestConnections];
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  // ホストのアニメーション開始
  runLotteryAnimation();
  broadcast(EVENTS.LOTTERY_START);

  // 遅延して配役・ミッション通知
  setTimeout(() => {
    participants.forEach((target, index) => {
      const assignedRole = shuffledRoles[index];
      
      // 公開設定によるミッションのフィルタリング
      const isPublic = state.missionPublic;
      let missionToSend = '';

      if (isPublic) {
        missionToSend = mission;
      } else {
        if (assignedRole.type === 'werewolf') {
          missionToSend = mission;
        } else {
          missionToSend = '（非公開）';
        }
      }

      if (target === 'SELF') {
        state.assignedRole = assignedRole.name;
        state.selectedMission = missionToSend;
      } else {
        sendTo(target, EVENTS.LOTTERY_ROLE, { role: assignedRole.name });
        sendTo(target, EVENTS.LOTTERY_MISSION, { mission: missionToSend });
      }
    });

    // アニメーション終了後にフェーズを移行させる
    setTimeout(() => {
      state.phase = 'RESULT';
      broadcast(EVENTS.GAME_PHASE, { phase: 'RESULT' }); // サーバー側でもRESULTフェーズ管理
    }, 4500); // 元の実装の4.5sをそのまま使用
  }, 500);
}

export function hostResetGame() {
  if (state.role !== 'HOST') return;

  state.phase = 'LOBBY';
  state.selectedMission = null;
  state.assignedRole = null;
  broadcast(EVENTS.GAME_PHASE, { phase: 'LOBBY' });
}
