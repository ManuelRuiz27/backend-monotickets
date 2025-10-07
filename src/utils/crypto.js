const { randomBytes, scryptSync, timingSafeEqual, createHmac, randomUUID } = require('node:crypto');

const TOKEN_HEADER = base64UrlEncode(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));

function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const padLength = (4 - (str.length % 4)) % 4;
  const padded = str + '='.repeat(padLength);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const hash = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(password, salt, hash.length);
  return timingSafeEqual(hash, derived);
}

function signToken(payload, secret) {
  const header = TOKEN_HEADER;
  const payloadBuffer = Buffer.from(JSON.stringify(payload));
  const payloadSegment = base64UrlEncode(payloadBuffer);
  const data = `${header}.${payloadSegment}`;
  const signature = createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64UrlEncode(signature)}`;
}

function verifyToken(token, secret) {
  if (typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [headerSegment, payloadSegment, signatureSegment] = parts;
  if (headerSegment !== TOKEN_HEADER) {
    return null;
  }
  const expectedSignature = base64UrlEncode(createHmac('sha256', secret).update(`${headerSegment}.${payloadSegment}`).digest());
  const received = base64UrlDecode(signatureSegment);
  const expected = base64UrlDecode(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment).toString('utf8'));
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

module.exports = {
  base64UrlEncode,
  base64UrlDecode,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  randomUUID,
};
