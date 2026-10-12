import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export function notFoundHandler(req, res, next) {
  next(new AppError('Ruta no encontrada', 404, 'NOT_FOUND'));
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: err.issues,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }

  logger.error({ err, path: req.originalUrl, method: req.method }, 'Error no controlado');

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction ? 'Error interno del servidor' : err.message,
    },
  });
}
