import * as locationsService from './service.js';

export async function list(req, res) {
  const result = await locationsService.listLocations(req.validatedQuery);
  res.status(200).json(result);
}

export async function detail(req, res) {
  const result = await locationsService.getLocation(req.params.id);
  res.status(200).json(result);
}

export async function create(req, res) {
  const result = await locationsService.createLocation(req.body);
  res.status(201).json(result);
}

export async function update(req, res) {
  const result = await locationsService.updateLocation(req.params.id, req.body);
  res.status(200).json(result);
}

export async function remove(req, res) {
  const result = await locationsService.deleteLocation(req.params.id);
  res.status(200).json(result);
}
