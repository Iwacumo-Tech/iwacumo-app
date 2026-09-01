import { getDB } from './offline-db';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

let cachedKey: CryptoKey | null = null;
let cachedDeviceId: string | null = null;

function generateDeviceId(): string {
  const stored = localStorage.getItem('iwacumo_device_id');
  if (stored) return stored;
  
  const deviceId = crypto.randomUUID();
  localStorage.setItem('iwacumo_device_id', deviceId);
  return deviceId;
}

export async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const deviceId = generateDeviceId();
  const db = await getDB();
  
  const stored = await db.get('encryption_keys', deviceId);
  
  if (stored) {
    cachedKey = stored.key;
    cachedDeviceId = deviceId;
    return cachedKey;
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  await db.put('encryption_keys', {
    device_id: deviceId,
    key,
    created_at: new Date().toISOString(),
  });

  cachedKey = key;
  cachedDeviceId = deviceId;
  return key;
}

export async function encryptContent(content: string): Promise<{ encrypted: ArrayBuffer; iv: ArrayBuffer }> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encoded = new TextEncoder().encode(content);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  return { encrypted, iv: iv.buffer };
}

export async function decryptContent(encrypted: ArrayBuffer, iv: ArrayBuffer): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv) },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

export async function clearEncryptionKey(): Promise<void> {
  const deviceId = cachedDeviceId || generateDeviceId();
  const db = await getDB();
  await db.delete('encryption_keys', deviceId);
  cachedKey = null;
  cachedDeviceId = null;
  localStorage.removeItem('iwacumo_device_id');
}
