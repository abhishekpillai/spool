import { setAuthToken } from '../shared/auth';
import { initUpload, completeUpload } from '../shared/api';

// Listen for auth token from web app
chrome.runtime.onMessageExternal.addListener(
  async (message, _sender, sendResponse) => {
    if (message.type === 'AUTH_TOKEN' && message.token) {
      await setAuthToken(message.token, message.expiresIn);
      sendResponse({ success: true });
    }
  },
);

// Listen for messages from popup and offscreen document
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_TAB_CAPTURE') {
    handleTabCapture(message.tabId).then(sendResponse);
    return true; // async response
  }

  if (message.type === 'START_SCREEN_CAPTURE') {
    ensureOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({
        type: 'BEGIN_SCREEN_RECORDING',
        target: 'offscreen',
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'RECORDING_COMPLETE') {
    handleUpload(message.blob, message.mimeType).then(sendResponse);
    return true;
  }

  if (message.type === 'STOP_RECORDING') {
    chrome.runtime.sendMessage({
      type: 'STOP_RECORDING',
      target: 'offscreen',
    });
  }
});

async function handleTabCapture(tabId: number) {
  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    await ensureOffscreenDocument();

    chrome.runtime.sendMessage({
      type: 'BEGIN_TAB_RECORDING',
      target: 'offscreen',
      streamId,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function handleUpload(blobData: ArrayBuffer, mimeType: string) {
  try {
    const blob = new Blob([blobData], { type: mimeType });

    // 1. Init upload
    const initData = await initUpload(blob.size);

    // 2. Upload to R2
    if (initData.uploadType === 'single' && initData.presignedUrl) {
      await fetch(initData.presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });
    }

    // 3. Complete
    await completeUpload({
      videoId: initData.videoId,
      r2Key: initData.r2Key,
      uploadId: initData.uploadId,
    });

    // 4. Copy share URL to clipboard (via offscreen or popup)
    return { success: true, shareUrl: initData.shareUrl };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({});
  const hasOffscreen = existingContexts.some(
    (c) => c.contextType === 'OFFSCREEN_DOCUMENT',
  );

  if (!hasOffscreen) {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen/offscreen.html',
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Recording screen/tab audio and video',
    });
  }
}
