import { config } from '../../config/index.js';
import { User, Role, USER_STATUSES, ROLE_NAMES, TOKEN_TYPES } from '../../db/models/index.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { signAccessToken } from '../../utils/jwt.js';
import { AppError } from '../../middlewares/error.js';
import {
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  issueUserToken,
  consumeUserToken,
  revokeAllUserTokens,
} from '../../services/token.service.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../services/notifications.service.js';

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

export async function register(data) {
  const existing = await User.findOne({ where: { email: data.email } });
  if (existing) {
    throw new AppError('El correo ya está registrado', 409, 'EMAIL_IN_USE');
  }

  const asistente = await Role.findOne({ where: { name: ROLE_NAMES.asistente } });
  const passwordHash = await hashPassword(data.password);

  const user = await User.create({
    name: data.name,
    lastName: data.lastName,
    email: data.email,
    passwordHash,
    entity: data.entity ?? null,
    educationLevel: data.educationLevel ?? null,
    phone: data.phone ?? null,
    roleId: asistente.id,
    status: USER_STATUSES.pending,
  });

  const token = await issueUserToken(
    user.id,
    TOKEN_TYPES.emailVerification,
    config.tokens.emailVerificationTtlMs,
  );
  await sendVerificationEmail(user, token);

  return {
    user: { id: user.id, name: user.name, email: user.email, status: user.status },
  };
}

export async function resendVerification({ email }) {
  const user = await User.findOne({ where: { email } });

  if (user && user.status === USER_STATUSES.pending) {
    await revokeAllUserTokens(user.id, TOKEN_TYPES.emailVerification);
    const token = await issueUserToken(
      user.id,
      TOKEN_TYPES.emailVerification,
      config.tokens.emailVerificationTtlMs,
    );
    await sendVerificationEmail(user, token);
  }

  return { success: true };
}

export async function verifyEmail({ token }) {
  const record = await consumeUserToken(token, TOKEN_TYPES.emailVerification);
  const user = record.user;

  if (!user.emailVerifiedAt) {
    await user.update({
      status: USER_STATUSES.active,
      emailVerifiedAt: new Date(),
    });
  }

  return { success: true };
}

export async function forgotPassword({ email }) {
  const user = await User.findOne({ where: { email } });

  if (user && user.status === USER_STATUSES.active) {
    await revokeAllUserTokens(user.id, TOKEN_TYPES.passwordReset);
    const token = await issueUserToken(
      user.id,
      TOKEN_TYPES.passwordReset,
      config.tokens.passwordResetTtlMs,
    );
    await sendPasswordResetEmail(user, token);
  }

  return { success: true };
}

export async function resetPassword({ token, password }) {
  const record = await consumeUserToken(token, TOKEN_TYPES.passwordReset);
  const user = record.user;

  user.passwordHash = await hashPassword(password);
  await user.save();
  await revokeAllUserTokens(user.id, TOKEN_TYPES.refresh);

  return { success: true };
}
