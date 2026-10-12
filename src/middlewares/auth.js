import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './error.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Autenticación requerida', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return next(new AppError('Token inválido o expirado', 401, 'UNAUTHORIZED'));
  }
}
