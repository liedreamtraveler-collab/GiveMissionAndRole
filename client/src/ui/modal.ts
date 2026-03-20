import { elements } from '../state';

type ModalCallback = (result: string | boolean) => void;

let currentCallback: ModalCallback | null = null;
let mode: 'CONFIRM' | 'PROMPT' = 'CONFIRM';

export function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    mode = 'CONFIRM';
    currentCallback = (result) => resolve(result as boolean);
    elements.modal.title.innerText = title;
    elements.modal.body.innerText = message;
    elements.modal.container.classList.remove('hidden');
  });
}

export function showPrompt(title: string, message: string): Promise<string | null> {
  return new Promise((resolve) => {
    mode = 'PROMPT';
    currentCallback = (result) => resolve(result as string | null);
    elements.modal.title.innerText = title;
    elements.modal.body.innerHTML = `${message}<br><input type="text" id="modal-input-field" />`;
    elements.modal.container.classList.remove('hidden');
    const input = document.getElementById('modal-input-field') as HTMLInputElement;
    if (input) input.focus();
  });
}

elements.modal.cancelBtn.addEventListener('click', () => {
  elements.modal.container.classList.add('hidden');
  if (currentCallback) {
    currentCallback(mode === 'PROMPT' ? null : false);
    currentCallback = null;
  }
});

elements.modal.confirmBtn.addEventListener('click', () => {
  elements.modal.container.classList.add('hidden');
  if (currentCallback) {
    if (mode === 'PROMPT') {
      const input = document.getElementById('modal-input-field') as HTMLInputElement;
      currentCallback(input ? input.value : '');
    } else {
      currentCallback(true);
    }
    currentCallback = null;
  }
});
