import { AppError } from './error.js';

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Autenticación requerida', 401, 'UNAUTHORIZED'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AppError('No tienes permisos para esta acción', 403, 'FORBIDDEN'));
    }

    return next();
  };
}
