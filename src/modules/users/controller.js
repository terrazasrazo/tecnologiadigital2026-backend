import * as usersService from './service.js';

export async function me(req, res) {
  const result = await usersService.getProfile(req.user.id);
  res.status(200).json(result);
}

export async function updateMe(req, res) {
  const result = await usersService.updateProfile(req.user.id, req.body);
  res.status(200).json(result);
}

export async function changePassword(req, res) {
  const result = await usersService.changePassword(req.user.id, req.body);
  res.status(200).json(result);
}

export async function list(req, res) {
  const result = await usersService.listUsers(req.validatedQuery);
  res.status(200).json(result);
}

export async function detail(req, res) {
  const result = await usersService.getUser(req.params.id);
  res.status(200).json(result);
}

export async function create(req, res) {
  const result = await usersService.createUser(req.body);
  res.status(201).json(result);
}

export async function update(req, res) {
  const result = await usersService.updateUser(req.params.id, req.body);
  res.status(200).json(result);
}

export async function updateStatus(req, res) {
  const result = await usersService.updateStatus(req.params.id, req.body.status);
  res.status(200).json(result);
}

export async function remove(req, res) {
  const result = await usersService.deleteUser(req.params.id, req.user.id);
  res.status(200).json(result);
}
