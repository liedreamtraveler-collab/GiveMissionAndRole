import { elements, state } from '../state';
import { GamePhase } from '../types';

export function transitionTo(phase: GamePhase) {
  if (state.phase === phase) return;
  state.phase = phase;

  // CONNECT -> LOBBY
  if (phase === 'LOBBY') {
    elements.screens.connect.style.opacity = '0';
    setTimeout(() => {
      elements.screens.connect.classList.remove('active');
      elements.screens.connect.classList.add('hidden');
      
      elements.screens.lobby.classList.remove('hidden');
      elements.screens.lobby.classList.add('active');
      elements.screens.lobby.style.opacity = '1';
    }, 300);
  }

  // LOBBY -> LOTTERY
  if (phase === 'LOTTERY') {
    elements.screens.lobby.style.opacity = '0';
    setTimeout(() => {
      elements.screens.lobby.classList.remove('active');
      elements.screens.lobby.classList.add('hidden');
      
      elements.screens.lottery.classList.remove('hidden');
      elements.screens.lottery.classList.add('active');
    }, 300);
  }

  // LOTTERY -> RESULT
  if (phase === 'RESULT') {
    elements.screens.lottery.classList.remove('active');
    elements.screens.lottery.classList.add('hidden');

    elements.screens.result.classList.remove('hidden');
    elements.screens.result.classList.add('active');
  }

  // RESULT -> CONNECT (リセット時)
  if (phase === 'CONNECT') {
    elements.screens.result.style.opacity = '0';
    setTimeout(() => {
      elements.screens.result.classList.remove('active');
      elements.screens.result.classList.add('hidden');
      elements.screens.result.style.opacity = '1';

      elements.screens.connect.classList.remove('hidden');
      elements.screens.connect.classList.add('active');
      elements.screens.connect.style.opacity = '1';
    }, 300);
  }
}

export function directlyShowScreen(phase: GamePhase) {
  state.phase = phase;
  ['connect', 'lobby', 'lottery', 'result'].forEach(key => {
    elements.screens[key as keyof typeof elements.screens].classList.add('hidden');
    elements.screens[key as keyof typeof elements.screens].classList.remove('active');
  });

  const target = phase === 'CONNECT' ? 'connect' : phase === 'LOBBY' ? 'lobby' : phase === 'LOTTERY' ? 'lottery' : 'result';
  elements.screens[target].classList.remove('hidden');
  elements.screens[target].classList.add('active');
  elements.screens[target].style.opacity = '1';
}
