import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns a 32-byte Buffer key from the configured hex key
 */
const getKeyBuffer = () => {
  const hex = env.ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  return crypto.createHash('sha256').update(hex).digest();
};

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Output format: iv:authTag:ciphertext (hex)
 */
export const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an AES-256-GCM encrypted string
 */
export const decrypt = (encryptedData) => {
  if (!encryptedData) return null;
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  const [ivHex, tagHex, contentHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(contentHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Hashes a plaintext password using bcrypt
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plaintext password against a bcrypt hash
 */
export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Signs a JWT payload
 */
export const signToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

/**
 * Verifies a JWT token
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Generates a cryptographically secure random token (e.g. for OAuth state)
 */
export const generateSecureState = (userId) => {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${userId}:${randomBytes}:${timestamp}`)
    .digest('hex');
  return `${userId}.${randomBytes}.${timestamp}.${signature}`;
};

/**
 * Validates the HMAC signature and timestamp of an OAuth state string
 */
export const validateSecureState = (state, maxAgeMs = 15 * 60 * 1000) => {
  if (!state || typeof state !== 'string') return null;
  const parts = state.split('.');
  if (parts.length !== 4) return null;
  const [userId, randomBytes, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) {
    return null; // Expired
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${userId}:${randomBytes}:${timestamp}`)
    .digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { userId, timestamp };
  }
  return null;
};

