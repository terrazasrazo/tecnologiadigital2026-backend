import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessTtl,
    issuer: 'eventos-api',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, { issuer: 'eventos-api' });
}

export function signTalkToken(talk) {
  return jwt.sign({ talkId: talk.id, purpose: 'attendance' }, talkTokenSecret(talk), {
    audience: 'talk-attendance',
    expiresIn: '30d',
  });
}

export function verifyTalkToken(token, talk) {
  return jwt.verify(token, talkTokenSecret(talk), { audience: 'talk-attendance' });
}

function talkTokenSecret(talk) {
  if (!talk.qrSecret) {
    throw new Error('La ponencia no tiene un secreto QR configurado');
  }
  return `${config.jwt.secret}:${talk.qrSecret}`;
}
