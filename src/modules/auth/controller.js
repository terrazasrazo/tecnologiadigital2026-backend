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

export async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function resendVerification(req, res) {
  const result = await authService.resendVerification(req.body);
  res.status(200).json(result);
}

export async function verifyEmail(req, res) {
  const result = await authService.verifyEmail(req.body);
  res.status(200).json(result);
}

export async function forgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body);
  res.status(200).json(result);
}

export async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  res.status(200).json(result);
}
