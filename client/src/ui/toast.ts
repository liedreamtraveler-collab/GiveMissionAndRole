import { elements } from '../state';
import he from 'he';

export function showToast(message: string, isError = true) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.backgroundColor = isError ? 'var(--color-error)' : 'var(--color-success)';
  toast.innerText = message;
  elements.common.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

export function showRejoinBanner() {
  elements.common.rejoinBanner.classList.remove('hidden');
  setTimeout(() => {
    elements.common.rejoinBanner.classList.add('hidden');
  }, 3000);
}

export function sanitizeInput(input: string): string {
  return he.encode(input.trim());
}

export function decodeInput(input: string): string {
  return he.decode(input);
}
