import React, { useState } from 'react';
import { Home } from './pages/Home';
import { Recording } from './pages/Recording';
import { Done } from './pages/Done';

type Screen = 'home' | 'recording' | 'done';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {screen === 'home' && (
        <Home onStartRecording={() => setScreen('recording')} />
      )}
      {screen === 'recording' && (
        <Recording
          onStopRecording={(url) => {
            setShareUrl(url);
            setScreen('done');
          }}
        />
      )}
      {screen === 'done' && shareUrl && (
        <Done
          shareUrl={shareUrl}
          onRecordAnother={() => {
            setShareUrl(null);
            setScreen('home');
          }}
        />
      )}
    </div>
  );
}
