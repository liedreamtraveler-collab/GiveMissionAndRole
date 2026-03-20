export const EVENTS = {
  // C -> S
  GAME_START: 'game:start',
  GAME_RESET: 'game:reset',
  PRESET_SAVE: 'preset:save',
  PRESET_LOAD: 'preset:load',
  PRESET_DELETE: 'preset:delete',
  PRESET_LIST_REQ: 'preset:list_request',
  SYNC_ITEMS: 'sync:items',

  // S -> C
  SESSION_INIT: 'session:init',
  LOBBY_UPDATE: 'lobby:update',
  HOST_CHANGED: 'host:changed',
  GAME_PHASE: 'game:phase',
  GAME_ERROR: 'game:error',
  LOTTERY_START: 'lottery:start',
  LOTTERY_MISSION: 'lottery:mission',
  LOTTERY_ROLE: 'lottery:role',
  LOTTERY_NO_ROLE: 'lottery:no_role',
  LOTTERY_REJOIN: 'lottery:rejoin',
  RESULT_REJOIN: 'result:rejoin',
  RESULT_NO_ROLE: 'result:no_role',
  PRESET_LIST: 'preset:list',
  PRESET_LOADED: 'preset:loaded',
  SYNC_ITEMS_UPDATE: 'sync:items_update'
} as const;
