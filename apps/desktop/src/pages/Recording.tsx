import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function Recording({ onStopRecording }: { onStopRecording: (url: string) => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleStop() {
    try {
      const result = await invoke<{ shareUrl: string }>('stop_recording');
      onStopRecording(result.shareUrl);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  }

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  return (
    <div style={styles.container}>
      <div style={styles.dotRow}>
        <div style={styles.redDot} />
        <span style={styles.timer}>
          {m}:{s.toString().padStart(2, '0')}
        </span>
      </div>
      <button style={styles.stopBtn} onClick={handleStop}>
        Stop Recording
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', padding: '24px', gap: '16px',
  },
  dotRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  redDot: {
    width: '14px', height: '14px', borderRadius: '50%', background: '#dc2626',
  },
  timer: {
    fontSize: '36px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  stopBtn: {
    padding: '12px 32px', borderRadius: '10px', border: 'none',
    background: '#dc2626', color: '#fff', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer',
  },
};
