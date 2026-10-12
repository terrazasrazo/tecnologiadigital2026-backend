import * as authService from './service.js';

export async function login(req, res) {
  const result = await authService.login(req.body);
  res.status(200).json(result);
}

export async function refresh(req, res) {
  const result = await authService.refresh(req.body);
  res.status(200).json(result);
}

export async function logout(req, res) {
  const result = await authService.logout(req.body);
  res.status(200).json(result);
}
