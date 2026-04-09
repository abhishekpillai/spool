import React, { useState, useEffect } from 'react';

export function Done({
  shareUrl,
  onRecordAnother,
}: {
  shareUrl: string;
  onRecordAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Auto-copy on mount
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  }, [shareUrl]);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.container}>
      <div style={styles.checkmark}>&#10003;</div>
      <h2 style={styles.heading}>Recording saved!</h2>
      <p style={styles.subtitle}>Link copied to clipboard</p>

      <div style={styles.linkBox}>
        <span style={styles.linkText}>{shareUrl}</span>
        <button style={styles.copyBtn} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <button style={styles.againBtn} onClick={onRecordAnother}>
        Record another
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', padding: '32px', gap: '12px',
  },
  checkmark: {
    width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7',
    color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px',
  },
  heading: { fontSize: '20px', fontWeight: 700 },
  subtitle: { fontSize: '13px', color: '#888' },
  linkBox: {
    display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6',
    borderRadius: '8px', padding: '8px 12px', width: '100%', maxWidth: '320px',
    marginTop: '8px',
  },
  linkText: {
    flex: 1, fontSize: '12px', color: '#6b46c1', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  copyBtn: {
    padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
    background: '#fff', fontSize: '12px', cursor: 'pointer', flexShrink: 0,
  },
  againBtn: {
    padding: '10px 24px', borderRadius: '8px', border: '1px solid #e2e8f0',
    background: '#fff', fontSize: '14px', cursor: 'pointer', marginTop: '8px',
  },
};
