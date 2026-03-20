import gsap from 'gsap';
import { elements, state } from '../state';
import { transitionTo } from './transition';
import { fireConfetti } from './background';
import { decodeInput } from '../ui/toast';

export function runLotteryAnimation() {
  // アニメーション開始前に以前のテキストを物理的に消去し、古い結果が透けて見える余地を無くす
  elements.lottery.missionText.innerText = '';
  
  const tl = gsap.timeline();

  // Phase 1: Lock (0-0.5s)
  tl.to('#game-start-btn', { scale: 1.1, duration: 0.1 })
    .to('#game-start-btn', { scale: 0, opacity: 0, duration: 0.3 })
    .to(['.mission-box-container', '.role-box-container'], {
      opacity: 0, y: -20, duration: 0.3, stagger: 0.1
    }, '-=0.2')
    .call(() => {
      transitionTo('LOTTERY');
      // 表示された直後に確実に表面(0deg)へリセットし、スケールも0からアニメーションできるようにする
      gsap.set('.lottery-card-inner', { rotateY: 0 });
      gsap.set('#lottery-card', { rotateY: 0, scaleY: 0 });
    });

  // Phase 2: Roulette (0.5-3.0s)
  // Animation happens on #lottery-card scaleY 0->1
  tl.fromTo('#lottery-card', 
    { scaleY: 0 },
    { scaleY: 1, duration: 0.5, ease: 'back.out(1.7)' },
    '+=0.2'
  );

  // Reel effect simulation
  tl.call(() => {
    startSlotReel(2000); // run reel for 2 seconds
  });

  // Wait for 2.5s
  tl.to({}, { duration: 2.5 });

  // Phase 3: Reveal (3.0-4.5s)
  // コンテナ全体ではなく「内部のinner」を180度反転させることで裏面を表示する
  tl.to('.lottery-card-inner', { rotateY: 90, duration: 0.3 })
    .call(() => {
      // populate result
      elements.lottery.missionText.innerText = decodeInput(state.selectedMission || 'ミッション');
      // fire confetti
      fireConfetti();
    })
    .to('.lottery-card-inner', { rotateY: 180, duration: 0.3 });

  // Phase 4: Result settle (4.5s)
  tl.to({}, { duration: 1.5 })
    .call(() => {
      transitionTo('RESULT');
      setupResultScreen();
      // Result slide in
      gsap.fromTo('#result-screen',
        { y: '100%', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
      // Role scale up
      gsap.fromTo('#result-role-text',
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.3 }
      );
    });
}

function startSlotReel(durationMs: number) {
  const reel = elements.lottery.slotReel;
  reel.innerHTML = '';
  
  // ミッションのみをスロットに表示する
  const items = [...state.missions];
  if (items.length === 0) items.push('?????');
  
  // より偏りをなくすために、均等なプールから取り出す
  let pool = [...items];
  const generateNext = () => {
    if (pool.length === 0) pool = [...items];
    const idx = Math.floor(Math.random() * pool.length);
    return pool.splice(idx, 1)[0];
  };

  // Dummy generate 50 items
  for(let i=0; i<50; i++) {
    const li = document.createElement('li');
    li.innerText = decodeInput(generateNext());
    reel.appendChild(li);
  }
  
  // animate it scrolling up
  gsap.fromTo(reel, 
    { y: 0 }, 
    { y: -120 * 48, duration: durationMs / 1000, ease: 'power1.inOut' }
  );
}

export function setupResultScreen() {
  elements.result.missionText.innerText = decodeInput(state.selectedMission || '');
  
  if (state.assignedRole) {
    elements.result.roleText.innerText = decodeInput(state.assignedRole);
    elements.result.roleText.classList.remove('hidden');
    elements.result.noRoleText.classList.add('hidden');
  } else {
    elements.result.roleText.classList.add('hidden');
    elements.result.noRoleText.classList.remove('hidden');
  }

  if (state.role === 'HOST') {
    elements.result.resetBtn.classList.remove('hidden');
    elements.result.waitingText.classList.add('hidden');
  } else {
    elements.result.resetBtn.classList.add('hidden');
    elements.result.waitingText.classList.remove('hidden');
  }
}
