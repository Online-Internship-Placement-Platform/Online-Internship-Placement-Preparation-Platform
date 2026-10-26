import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, {
      N: COST,
      r: BLOCK_SIZE,
      p: PARALLELIZATION,
      maxmem: MAX_MEMORY,
    }, (error, key) => error ? reject(error) : resolve(key));
  });
}

/** Creates a versioned scrypt hash; store this string in User.passwordHash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/** Returns false for missing, malformed, unsupported, or non-matching hashes. */
export async function verifyPassword(password: string, encodedHash: string | null): Promise<boolean> {
  if (!encodedHash) return false;
  const [algorithm, cost, blockSize, parallelization, saltEncoded, keyEncoded, extra] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" || cost !== String(COST) || blockSize !== String(BLOCK_SIZE) ||
    parallelization !== String(PARALLELIZATION) || !saltEncoded || !keyEncoded || extra !== undefined
  ) return false;

  const salt = Buffer.from(saltEncoded, "base64url");
  const expected = Buffer.from(keyEncoded, "base64url");
  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
