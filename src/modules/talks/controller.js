import * as talksService from './service.js';

export async function list(req, res) {
  const result = await talksService.listTalks(req.validatedQuery);
  res.status(200).json(result);
}

export async function detail(req, res) {
  const result = await talksService.getTalk(req.params.id);
  res.status(200).json(result);
}

export async function create(req, res) {
  const result = await talksService.createTalk(req.body, req.user);
  res.status(201).json(result);
}

export async function update(req, res) {
  const result = await talksService.updateTalk(req.params.id, req.body, req.user);
  res.status(200).json(result);
}

export async function remove(req, res) {
  const result = await talksService.deleteTalk(req.params.id);
  res.status(200).json(result);
}
