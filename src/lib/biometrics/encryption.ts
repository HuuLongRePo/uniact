/**
 * Biometric Template Encryption
 * Uses AES-256-GCM for encrypting face/iris embeddings
 */

/**
 * Generate encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array | Buffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltArray = salt instanceof Buffer ? new Uint8Array(salt) : salt;

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltArray as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt biometric embedding using AES-256-GCM
 */
export async function encryptEmbedding(
  embedding: Float32Array | number[],
  userId: number
): Promise<{
  encryptedData: string;
  iv: string;
  salt: string;
}> {
  // Convert embedding to ArrayBuffer
  const embeddingArray =
    embedding instanceof Float32Array ? embedding : new Float32Array(embedding);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from user ID (in production, use secure key management)
  const password = `biometric_key_${userId}_${process.env.BIOMETRIC_SECRET || 'default_secret'}`;
  const key = await deriveKey(password, salt);

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    new Uint8Array(embeddingArray.buffer) as BufferSource
  );

  // Convert to base64
  return {
    encryptedData: Buffer.from(encryptedBuffer).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    salt: Buffer.from(salt).toString('base64'),
  };
}

/**
 * Decrypt biometric embedding
 */
export async function decryptEmbedding(
  encryptedData: string,
  iv: string,
  salt: string,
  userId: number
): Promise<Float32Array> {
  // Decode from base64
  const encryptedBuffer = Buffer.from(encryptedData, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const saltBuffer = Buffer.from(salt, 'base64');

  // Derive key
  const password = `biometric_key_${userId}_${process.env.BIOMETRIC_SECRET || 'default_secret'}`;
  const key = await deriveKey(password, new Uint8Array(saltBuffer));

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    new Uint8Array(encryptedBuffer)
  );

  return new Float32Array(decryptedBuffer);
}

/**
 * Hash embedding for quick comparison (not reversible)
 */
export async function hashEmbedding(embedding: Float32Array | number[]): Promise<string> {
  const embeddingArray =
    embedding instanceof Float32Array ? embedding : new Float32Array(embedding);

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new Uint8Array(embeddingArray.buffer) as BufferSource
  );
  return Buffer.from(hashBuffer).toString('hex');
}
