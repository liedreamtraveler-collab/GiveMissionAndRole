import { GamePhase, UserRole, Preset } from './types';

export interface ClientState {
  peerId: string | null;      // My ID
  hostPeerId: string | null;  // Room Host ID
  role: UserRole | null;
  phase: GamePhase;
  connectedCount: number;
  missions: string[];
  missionPublic: boolean;
  citizenRoles: string[];
  werewolfRoles: string[];
  presets: Preset[];
  assignedRole: string | null;
  selectedMission: string | null;
}

const savedCitizenRoles = JSON.parse(localStorage.getItem('citizenRoles') || '[]');
const savedWerewolfRoles = JSON.parse(localStorage.getItem('werewolfRoles') || '[]');
const savedMissionPublic = localStorage.getItem('missionPublic') === 'true';

export const state: ClientState = {
  peerId: null,
  hostPeerId: null,
  role: null,
  phase: 'CONNECT',
  connectedCount: 0,
  missions: JSON.parse(localStorage.getItem('missions') || '[]'),
  missionPublic: savedMissionPublic,
  citizenRoles: savedCitizenRoles,
  werewolfRoles: savedWerewolfRoles,
  presets: [],
  assignedRole: null,
  selectedMission: null
};

// UI Elements
export const elements = {
  screens: {
    connect: document.getElementById('connect-screen') as HTMLElement,
    lobby: document.getElementById('lobby-screen') as HTMLElement,
    lottery: document.getElementById('lottery-screen') as HTMLElement,
    result: document.getElementById('result-screen') as HTMLElement
  },
  lobby: {
    connectionStatus: document.getElementById('connection-status') as HTMLElement,
    presetToggleBtn: document.getElementById('preset-toggle-btn') as HTMLButtonElement,
    presetMenu: document.getElementById('preset-menu') as HTMLElement,
    presetSaveBtn: document.getElementById('preset-save-btn') as HTMLButtonElement,
    presetList: document.getElementById('preset-list') as HTMLUListElement,
    missionCount: document.getElementById('mission-count') as HTMLElement,
    missionList: document.getElementById('mission-list') as HTMLUListElement,
    missionInput: document.getElementById('mission-input') as HTMLInputElement,
    missionAddBtn: document.getElementById('mission-add-btn') as HTMLButtonElement,
    missionPublicToggle: document.getElementById('mission-public-toggle') as HTMLInputElement,
    
    citizenCountInfo: document.getElementById('citizen-count-info') as HTMLElement,
    citizenList: document.getElementById('citizen-list') as HTMLUListElement,
    citizenInput: document.getElementById('citizen-input') as HTMLInputElement,
    citizenAddBtn: document.getElementById('citizen-add-btn') as HTMLButtonElement,

    werewolfCountInfo: document.getElementById('werewolf-count-info') as HTMLElement,
    werewolfList: document.getElementById('werewolf-list') as HTMLUListElement,
    werewolfInput: document.getElementById('werewolf-input') as HTMLInputElement,
    werewolfAddBtn: document.getElementById('werewolf-add-btn') as HTMLButtonElement,

    totalRoleCountInfo: document.getElementById('total-role-count-info') as HTMLElement,
    roomCreateBtn: document.getElementById('room-create-btn') as HTMLButtonElement,
    roomJoinBtn: document.getElementById('room-join-btn') as HTMLButtonElement,
    roomJoinInput: document.getElementById('room-join-input') as HTMLInputElement,
    gameStartBtn: document.getElementById('game-start-btn') as HTMLButtonElement,
  },
  lottery: {
    missionText: document.getElementById('lottery-mission-text') as HTMLElement,
    slotReel: document.getElementById('slot-reel') as HTMLUListElement,
    card: document.getElementById('lottery-card') as HTMLElement,
  },
  result: {
    missionText: document.getElementById('result-mission-text') as HTMLElement,
    roleText: document.getElementById('result-role-text') as HTMLElement,
    noRoleText: document.getElementById('result-no-role-text') as HTMLElement,
    resetBtn: document.getElementById('game-reset-btn') as HTMLButtonElement,
    waitingText: document.getElementById('waiting-reset-text') as HTMLElement,
  },
  common: {
    toastContainer: document.getElementById('toast-container') as HTMLElement,
    roomIdDisplay: document.getElementById('room-id-display') as HTMLElement,
  },
  modal: {
    container: document.getElementById('modal-container') as HTMLElement,
    title: document.getElementById('modal-title') as HTMLElement,
    body: document.getElementById('modal-body') as HTMLElement,
    cancelBtn: document.getElementById('modal-cancel-btn') as HTMLButtonElement,
    confirmBtn: document.getElementById('modal-confirm-btn') as HTMLButtonElement,
  }
};
