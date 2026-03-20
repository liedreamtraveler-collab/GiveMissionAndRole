import { tsParticles } from '@tsparticles/engine';
import { confetti } from '@tsparticles/confetti';

// Import required basic modules to initialize tsParticles
import { loadBasic } from "@tsparticles/basic";

export async function initBackground() {
  await loadBasic(tsParticles);
  
  tsParticles.load({
    id: 'tsparticles',
    options: {
      particles: {
        number: { value: 80 },
        color: { value: ['#7c3aed', '#06b6d4', '#f1f5f9'] },
        opacity: { value: 0.3, random: true },
        size: { value: { min: 1, max: 3 } },
        move: { enable: true, speed: 0.5, direction: 'none', random: true },
        links: { enable: true, distance: 120, opacity: 0.15, color: '#94a3b8' }
      },
      background: { color: 'transparent' }
    }
  });
}

export async function fireConfetti() {
  await confetti("tsparticles", {
    particleCount: 150,
    spread: 120,
    origin: { y: 0.6 }
  });
  
  // After a few seconds, revert to normal background
  setTimeout(() => {
    initBackground();
  }, 4000);
}
