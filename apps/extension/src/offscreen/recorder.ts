let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'BEGIN_TAB_RECORDING':
      startTabRecording(message.streamId);
      break;
    case 'BEGIN_SCREEN_RECORDING':
      startScreenRecording();
      break;
    case 'STOP_RECORDING':
      stopRecording();
      break;
  }
});

async function startTabRecording(streamId: string) {
  const media = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as any,
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as any,
  });

  // Keep tab audio playing for user
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(media);
  source.connect(audioCtx.destination);

  // Also capture mic
  try {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    audioCtx.createMediaStreamSource(micStream).connect(dest);

    const combinedStream = new MediaStream([
      ...media.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    startRecording(combinedStream);
  } catch {
    // No mic — record tab only
    startRecording(media);
  }
}

async function startScreenRecording() {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: true,
  });

  try {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    if (displayStream.getAudioTracks().length > 0) {
      audioCtx.createMediaStreamSource(displayStream).connect(dest);
    }
    audioCtx.createMediaStreamSource(micStream).connect(dest);

    const combined = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    startRecording(combined);
  } catch {
    startRecording(displayStream);
  }
}

function startRecording(stream: MediaStream) {
  chunks = [];
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';

  mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 3_000_000,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: mimeType });
    const arrayBuffer = await blob.arrayBuffer();

    chrome.runtime.sendMessage({
      type: 'RECORDING_COMPLETE',
      blob: arrayBuffer,
      mimeType,
    });

    // Stop all tracks
    stream.getTracks().forEach((t) => t.stop());
  };

  mediaRecorder.start(1000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}
