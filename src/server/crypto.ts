/**
 * MK Formation — Isomorphic Cryptographic Utilities
 * Pure TypeScript implementation compatible with both Node.js and Browser environments
 * Zero node:crypto dependency to ensure seamless browser execution in Vite
 */

// ==========================================
// PURE TYPESCRIPT SHA-256 (FIPS 180-4)
// ==========================================

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256Bytes(input: Uint8Array): Uint8Array {
  const h0 = 0x6a09e667;
  const h1 = 0xbb67ae85;
  const h2 = 0x3c6ef372;
  const h3 = 0xa54ff53a;
  const h4 = 0x510e527f;
  const h5 = 0x9b05688c;
  const h6 = 0x1f83d9ab;
  const h7 = 0x5be0cd19;

  let H0 = h0;
  let H1 = h1;
  let H2 = h2;
  let H3 = h3;
  let H4 = h4;
  let H5 = h5;
  let H6 = h6;
  let H7 = h7;

  const length = input.length;
  const bitLength = length * 8;

  // Pre-processing: padding
  const newLength = ((length + 9 + 63) >>> 6) << 6;
  const padded = new Uint8Array(newLength);
  padded.set(input);
  padded[length] = 0x80;

  const view = new DataView(padded.buffer);
  // Big-endian 64-bit integer bit length
  view.setUint32(newLength - 4, bitLength >>> 0);
  view.setUint32(newLength - 8, Math.floor(bitLength / 0x100000000));

  const W = new Uint32Array(64);

  // Process each 512-bit (64-byte) chunk
  for (let i = 0; i < newLength; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, H0);
  resultView.setUint32(4, H1);
  resultView.setUint32(8, H2);
  resultView.setUint32(12, H3);
  resultView.setUint32(16, H4);
  resultView.setUint32(20, H5);
  resultView.setUint32(24, H6);
  resultView.setUint32(28, H7);
  return result;
}

export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function sha256Hex(str: string): string {
  return bytesToHex(sha256Bytes(stringToBytes(str)));
}

// ==========================================
// SECURE RANDOM & UUID
// ==========================================

export function getRandomBytes(length = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  // Fallback for sandboxed environments
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

export function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateSecureToken(byteLength = 32): string {
  return bytesToHex(getRandomBytes(byteLength));
}

// ==========================================
// HMAC-SHA256 & PBKDF2 (PORTABLE & CONSTANT-TIME)
// ==========================================

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let formattedKey = key;
  if (key.length > blockSize) {
    formattedKey = sha256Bytes(key);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(formattedKey);

  const oPad = new Uint8Array(blockSize);
  const iPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oPad[i] = paddedKey[i] ^ 0x5c;
    iPad[i] = paddedKey[i] ^ 0x36;
  }

  const inner = new Uint8Array(blockSize + message.length);
  inner.set(iPad);
  inner.set(message, blockSize);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(blockSize + 32);
  outer.set(oPad);
  outer.set(innerHash, blockSize);
  return sha256Bytes(outer);
}

/**
 * PBKDF2 with HMAC-SHA256 (1,000 rounds for robust key derivation)
 */
export function pbkdf2Sha256(password: string, saltHex: string, iterations = 1000): string {
  const keyBytes = stringToBytes(password);
  const saltBytes = stringToBytes(saltHex);

  // U1 = HMAC(key, salt || 0x00000001)
  const initial = new Uint8Array(saltBytes.length + 4);
  initial.set(saltBytes);
  initial[saltBytes.length + 3] = 1;

  let u = hmacSha256(keyBytes, initial);
  const result = new Uint8Array(u);

  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(keyBytes, u);
    for (let k = 0; k < result.length; k++) {
      result[k] ^= u[k];
    }
  }

  return bytesToHex(result);
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ==========================================
// EXPORTED DOMAIN CRYPTO HELPERS
// ==========================================

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = bytesToHex(getRandomBytes(16));
  const hash = pbkdf2Sha256(password, salt);
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const computedHash = pbkdf2Sha256(password, salt);
    return timingSafeEqual(computedHash, storedHash);
  } catch {
    return false;
  }
}

/**
 * Computes an immutable SHA-256 fingerprint for document data snapshot.
 */
export function computeSha256Fingerprint(data: unknown): string {
  const serialized = JSON.stringify(data, Object.keys(data as object).sort());
  return sha256Hex(serialized);
}
