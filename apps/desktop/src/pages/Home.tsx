import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

type CaptureMode = 'fullscreen' | 'window';

export function Home({ onStartRecording }: { onStartRecording: () => void }) {
  const [mode, setMode] = useState<CaptureMode>('fullscreen');

  async function handleStart() {
    try {
      await invoke('start_recording', { mode });
      onStartRecording();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Spool</h1>
      <p style={styles.subtitle}>Screen recorder</p>

      <div style={styles.modeSelector}>
        <button
          style={mode === 'fullscreen' ? styles.modeActive : styles.modeBtn}
          onClick={() => setMode('fullscreen')}
        >
          Full Screen
        </button>
        <button
          style={mode === 'window' ? styles.modeActive : styles.modeBtn}
          onClick={() => setMode('window')}
        >
          Window
        </button>
      </div>

      <button style={styles.recordBtn} onClick={handleStart}>
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
    justifyContent: 'center',
    height: '100%',
    padding: '32px',
    gap: '12px',
  },
  title: { fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' },
  subtitle: { fontSize: '14px', color: '#888', marginBottom: '16px' },
  modeSelector: {
    display: 'flex',
    gap: '4px',
    background: '#f0f0f0',
    borderRadius: '10px',
    padding: '4px',
    width: '100%',
    maxWidth: '280px',
  },
  modeBtn: {
    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
    background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#666',
  },
  modeActive: {
    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
    background: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  recordBtn: {
    width: '100%', maxWidth: '280px', padding: '12px', borderRadius: '10px',
    border: 'none', background: '#6b46c1', color: '#fff', fontSize: '15px',
    fontWeight: 600, cursor: 'pointer', marginTop: '8px',
  },
};
