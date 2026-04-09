// Floating recording indicator — injected as content script
// Uses Shadow DOM to avoid style conflicts

let indicator: HTMLElement | null = null;
let startTime = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_INDICATOR') {
    showIndicator();
  } else if (message.type === 'HIDE_INDICATOR') {
    hideIndicator();
  }
});

function showIndicator() {
  if (indicator) return;

  indicator = document.createElement('div');
  indicator.id = 'spool-recording-indicator';
  const shadow = indicator.attachShadow({ mode: 'closed' });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
      }
      .pill {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        border-radius: 999px;
        font-family: system-ui, sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(8px);
        user-select: none;
        font-variant-numeric: tabular-nums;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    </style>
    <div class="pill">
      <span class="dot"></span>
      <span class="timer">0:00</span>
    </div>
  `;

  document.body.appendChild(indicator);
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timer = shadow.querySelector('.timer');
    if (timer) timer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function hideIndicator() {
  if (timerInterval) clearInterval(timerInterval);
  if (indicator) {
    indicator.remove();
    indicator = null;
  }
}
