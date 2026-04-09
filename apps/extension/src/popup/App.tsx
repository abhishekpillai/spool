import React, { useState, useEffect } from 'react';
import { isAuthenticated, openAuthPage } from '../shared/auth';

type RecordingMode = 'tab' | 'screen';
type RecordingState = 'idle' | 'recording' | 'uploading' | 'done';

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [state, setState] = useState<RecordingState>('idle');
  const [mode, setMode] = useState<RecordingMode>('tab');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    isAuthenticated().then(setAuthed);
  }, []);

  useEffect(() => {
    if (state !== 'recording') return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [state]);

  async function startRecording() {
    setState('recording');
    setElapsed(0);

    if (mode === 'tab') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        chrome.runtime.sendMessage({ type: 'START_TAB_CAPTURE', tabId: tab.id });
      }
    } else {
      chrome.runtime.sendMessage({ type: 'START_SCREEN_CAPTURE' });
    }
  }

  async function stopRecording() {
    setState('uploading');
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });

    // Listen for upload completion
    const listener = (message: any) => {
      if (message.type === 'RECORDING_COMPLETE') return; // handled by background
      if (message.shareUrl) {
        setShareUrl(message.shareUrl);
        setState('done');
        navigator.clipboard.writeText(message.shareUrl);
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (authed === null) return <div style={styles.container}><p>Loading...</p></div>;

  if (!authed) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Spool</h1>
        <p style={styles.subtitle}>Unwind from Loom.</p>
        <button style={styles.primaryBtn} onClick={openAuthPage}>
          Connect to Spool
        </button>
      </div>
    );
  }

  if (state === 'done' && shareUrl) {
    return (
      <div style={styles.container}>
        <div style={styles.successIcon}>&#10003;</div>
        <p style={styles.subtitle}>Link copied to clipboard!</p>
        <a href={shareUrl} target="_blank" rel="noopener" style={styles.link}>
          {shareUrl}
        </a>
        <button style={styles.secondaryBtn} onClick={() => { setState('idle'); setShareUrl(null); }}>
          Record another
        </button>
      </div>
    );
  }

  if (state === 'uploading') {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
        <p style={styles.subtitle}>Uploading...</p>
      </div>
    );
  }

  if (state === 'recording') {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={styles.redDot} />
          <span style={{ fontSize: '24px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(elapsed)}
          </span>
        </div>
        <button style={{ ...styles.primaryBtn, background: '#dc2626' }} onClick={stopRecording}>
          Stop Recording
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Spool</h1>

      <div style={styles.modeSelector}>
        <button
          style={mode === 'tab' ? styles.modeActive : styles.modeBtn}
          onClick={() => setMode('tab')}
        >
          Current Tab
        </button>
        <button
          style={mode === 'screen' ? styles.modeActive : styles.modeBtn}
          onClick={() => setMode('screen')}
        >
          Full Screen
        </button>
      </div>

      <button style={styles.primaryBtn} onClick={startRecording}>
        Start Recording
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 20px',
    gap: '8px',
  },
  title: { fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '13px', color: '#666', marginBottom: '8px' },
  primaryBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    background: '#6b46c1',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#333',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  modeSelector: {
    display: 'flex',
    gap: '4px',
    background: '#f3f4f6',
    borderRadius: '8px',
    padding: '4px',
    width: '100%',
    marginBottom: '8px',
  },
  modeBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#666',
  },
  modeActive: {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    background: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  redDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#dc2626',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#6b46c1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  successIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '8px',
  },
  link: {
    fontSize: '12px',
    color: '#6b46c1',
    wordBreak: 'break-all',
    textAlign: 'center',
  },
};
