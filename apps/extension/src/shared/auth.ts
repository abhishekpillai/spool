const AUTH_URL = 'http://localhost:3000/auth/login';

export async function isAuthenticated(): Promise<boolean> {
  const { token, expiresAt } = await chrome.storage.local.get(['token', 'expiresAt']);
  if (!token) return false;
  if (expiresAt && Date.now() > expiresAt) {
    await chrome.storage.local.remove(['token', 'expiresAt']);
    return false;
  }
  return true;
}

export async function setAuthToken(token: string, expiresIn = 3600): Promise<void> {
  await chrome.storage.local.set({
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove(['token', 'expiresAt']);
}

export function openAuthPage(): void {
  const extensionId = chrome.runtime.id;
  chrome.tabs.create({
    url: `${AUTH_URL}?extensionId=${extensionId}`,
  });
}
