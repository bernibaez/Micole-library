// Cifrado autenticado AES-256-GCM para tokens OAuth de Google Drive en reposo.
// Requiere el secreto DRIVE_TOKEN_ENCRYPTION_KEY (32 bytes en base64).

function decodeBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

async function getCryptoKey(): Promise<CryptoKey> {
  const rawKey = Deno.env.get('DRIVE_TOKEN_ENCRYPTION_KEY')?.trim();
  if (!rawKey) {
    throw new Error(
      'Falta configurar el secreto DRIVE_TOKEN_ENCRYPTION_KEY en Supabase Edge Functions.'
    );
  }

  const decoded = decodeBase64(rawKey);
  if (decoded.byteLength !== 32) {
    throw new Error(
      'DRIVE_TOKEN_ENCRYPTION_KEY debe ser una clave aleatoria de exactamente 32 bytes codificada en Base64.'
    );
  }

  return crypto.subtle.importKey('raw', decoded, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  );
  return `v1:${encodeBase64(iv)}:${encodeBase64(ciphertext)}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const parts = payload.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('Formato de token cifrado inválido.');
  }
  const key = await getCryptoKey();
  const iv = decodeBase64(parts[1]);
  const ciphertext = decodeBase64(parts[2]);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
