import * as speakersService from './service.js';

export async function list(req, res) {
  const result = await speakersService.listSpeakers(req.validatedQuery);
  res.status(200).json(result);
}

export async function detail(req, res) {
  const result = await speakersService.getSpeaker(req.params.id);
  res.status(200).json(result);
}

export async function create(req, res) {
  const result = await speakersService.createSpeaker(req.body, req.file);
  res.status(201).json(result);
}

export async function update(req, res) {
  const result = await speakersService.updateSpeaker(req.params.id, req.body, req.file, req.user);
  res.status(200).json(result);
}

export async function remove(req, res) {
  const result = await speakersService.deleteSpeaker(req.params.id);
  res.status(200).json(result);
}

export async function removePhoto(req, res) {
  const result = await speakersService.removeSpeakerPhoto(req.params.id, req.user);
  res.status(200).json(result);
}
