export type GamePhase = 'CONNECT' | 'LOBBY' | 'LOTTERY' | 'RESULT';
export type UserRole = 'HOST' | 'GUEST';

export interface Preset {
  id: string;
  name: string;
  missions: string[];
  citizenRoles: string[];
  werewolfRoles: string[];
  createdAt: number;
}
