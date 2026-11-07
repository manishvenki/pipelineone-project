import dns from 'dns/promises';
import { URL } from 'url';
import env from '../config/env.js';

// IP ranges that are private or link-local
const PRIVATE_IP_RANGES = [
  /^127\./,                         // Loopback (127.0.0.0/8)
  /^10\./,                          // Private class A (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private class B (172.16.0.0/12)
  /^192\.168\./,                    // Private class C (192.168.0.0/16)
  /^169\.254\./,                    // Link-local / Cloud metadata (169.254.0.0/16)
  /^0\./,                           // Current network
  /^::1$/,                          // IPv6 loopback
  /^fc00:/i,                        // IPv6 private unique local
  /^fe80:/i,                        // IPv6 link-local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
];

/**
 * Validates a target URL against SSRF vulnerabilities
 * Throws an Error with a descriptive message if the URL targets forbidden destinations
 */
export const validateUrlForSsrf = async (rawUrl, options = {}) => {
  const allowPrivate = options.allowPrivate ?? (process.env.ALLOW_PRIVATE_JENKINS === 'true');

  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Invalid URL provided');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Malformed URL syntax');
  }

  // 1. Enforce allowed schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Forbidden protocol: "${parsed.protocol}". Only HTTP and HTTPS are permitted.`);
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    throw new Error('URLs containing inline user credentials are not allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Block well-known forbidden hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname) && !allowPrivate) {
    throw new Error(`Access to hostname "${hostname}" is blocked for security`);
  }

  // 4. If hostname is directly an IP address
  for (const regex of PRIVATE_IP_RANGES) {
    if (regex.test(hostname)) {
      if (!allowPrivate) {
        throw new Error(`Access to private/internal IP address "${hostname}" is prohibited`);
      }
    }
  }

  // 5. DNS resolution check (prevent DNS rebinding / internal host resolution)
  if (!allowPrivate) {
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        for (const regex of PRIVATE_IP_RANGES) {
          if (regex.test(addr.address)) {
            throw new Error(`Hostname "${hostname}" resolves to protected IP "${addr.address}"`);
          }
        }
      }
    } catch (dnsErr) {
      if (dnsErr.message.includes('protected IP')) {
        throw dnsErr;
      }
      throw new Error(`Could not resolve hostname "${hostname}": ${dnsErr.message}`);
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.origin + parsed.pathname.replace(/\/+$/, ''),
    origin: parsed.origin,
    protocol: parsed.protocol,
    hostname,
  };
};

export default {
  validateUrlForSsrf,
};

