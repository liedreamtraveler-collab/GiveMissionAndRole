import { initBackground } from './animation/background';
import { initLobbyEvents, renderLobby } from './pages/home';
import { directlyShowScreen } from './animation/transition';
import { state } from './state';

async function bootstrap() {
  // Initialize background particles
  await initBackground();

  // Initialize UI event listeners
  initLobbyEvents();

  // Initial render from local state (will be overridden by socket events)
  renderLobby();
  directlyShowScreen(state.phase);
}

bootstrap();
