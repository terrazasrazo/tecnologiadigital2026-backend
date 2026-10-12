import { config } from '../../config/index.js';
import { User, USER_STATUSES } from '../../db/models/index.js';
import { comparePassword } from '../../utils/password.js';
import { signAccessToken } from '../../utils/jwt.js';
import { AppError } from '../../middlewares/error.js';
import {
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
} from '../../services/token.service.js';

function buildTokens(user) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role.name,
  });
  const expiresIn = Math.floor(config.jwt.accessTtlMs / 1000);

  return { accessToken, tokenType: 'Bearer', expiresIn };
}

export async function login({ email, password }) {
  const user = await User.findOne({
    where: { email },
    include: [{ association: 'role' }],
  });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status !== USER_STATUSES.active) {
    throw new AppError('La cuenta no está activa', 403, 'ACCOUNT_NOT_ACTIVE');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const refreshToken = await issueRefreshToken(user.id);

  return {
    user: user.toPublicJSON(),
    tokens: { ...buildTokens(user), refreshToken },
  };
}

export async function refresh({ refreshToken }) {
  const token = await consumeRefreshToken(refreshToken);
  const user = token.user;

  if (user.status !== USER_STATUSES.active) {
    throw new AppError('La cuenta no está activa', 403, 'ACCOUNT_NOT_ACTIVE');
  }

  const newRefreshToken = await issueRefreshToken(user.id);

  return {
    user: user.toPublicJSON(),
    tokens: { ...buildTokens(user), refreshToken: newRefreshToken },
  };
}

export async function logout({ refreshToken }) {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  return { success: true };
}
