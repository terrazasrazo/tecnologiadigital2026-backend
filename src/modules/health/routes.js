import { Router } from 'express';
import { getHealth } from './controller.js';

export const healthRouter = Router();

healthRouter.get('/', getHealth);
