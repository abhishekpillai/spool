const API_BASE = 'http://localhost:3000';

async function getToken(): Promise<string | null> {
  const { token } = await chrome.storage.local.get('token');
  return token ?? null;
}

export async function initUpload(fileSize: number): Promise<{
  videoId: string;
  shareToken: string;
  shareUrl: string;
  uploadType: 'single' | 'multipart';
  presignedUrl?: string;
  presignedUrls?: string[];
  uploadId?: string;
  r2Key: string;
  partSize?: number;
}> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/upload/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ source: 'extension', fileSize }),
  });
  if (!res.ok) throw new Error(`Init failed: ${res.status}`);
  return res.json();
}

export async function completeUpload(data: {
  videoId: string;
  r2Key: string;
  uploadId?: string;
  parts?: { PartNumber: number; ETag: string }[];
}): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/upload/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Complete failed: ${res.status}`);
}

export { getToken, API_BASE };
