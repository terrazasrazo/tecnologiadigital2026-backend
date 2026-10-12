import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { Token, TOKEN_TYPES, User } from '../db/models/index.js';
import { AppError } from '../middlewares/error.js';

export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateOpaqueToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export async function issueRefreshToken(userId) {
  const rawToken = generateOpaqueToken();

  await Token.create({
    userId,
    tokenHash: hashToken(rawToken),
    type: TOKEN_TYPES.refresh,
    expiresAt: new Date(Date.now() + config.jwt.refreshTtlMs),
  });

  return rawToken;
}

export async function issueUserToken(userId, type, ttlMs) {
  const rawToken = generateOpaqueToken();

  await Token.create({
    userId,
    tokenHash: hashToken(rawToken),
    type,
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return rawToken;
}

export async function consumeUserToken(rawToken, type) {
  const token = await Token.findOne({
    where: { tokenHash: hashToken(rawToken), type },
    include: [{ model: User, as: 'user', include: [{ association: 'role' }] }],
  });

  if (!token) {
    throw new AppError('Token inválido', 400, 'INVALID_TOKEN');
  }

  if (token.usedAt) {
    throw new AppError('El token ya fue utilizado', 400, 'TOKEN_ALREADY_USED');
  }

  if (token.expiresAt.getTime() < Date.now()) {
    throw new AppError('El token ha expirado', 400, 'TOKEN_EXPIRED');
  }

  token.usedAt = new Date();
  await token.save();

  return token;
}

export async function consumeRefreshToken(rawToken) {
  const token = await Token.findOne({
    where: { tokenHash: hashToken(rawToken), type: TOKEN_TYPES.refresh },
    include: [{ model: User, as: 'user', include: [{ association: 'role' }] }],
  });

  if (!token) {
    throw new AppError('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (token.usedAt) {
    await revokeAllUserTokens(token.userId, TOKEN_TYPES.refresh);
    throw new AppError('Refresh token reutilizado', 401, 'REFRESH_TOKEN_REUSED');
  }

  if (token.expiresAt.getTime() <= Date.now()) {
    throw new AppError('Refresh token expirado', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  token.usedAt = new Date();
  await token.save();

  return token;
}

export async function revokeRefreshToken(rawToken) {
  await Token.update(
    { usedAt: new Date() },
    { where: { tokenHash: hashToken(rawToken), type: TOKEN_TYPES.refresh, usedAt: null } },
  );
}

export async function revokeAllUserTokens(userId, type) {
  await Token.update({ usedAt: new Date() }, { where: { userId, type, usedAt: null } });
}
