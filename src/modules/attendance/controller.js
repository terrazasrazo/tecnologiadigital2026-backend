import * as attendanceService from './service.js';

export async function register(req, res) {
  const result = await attendanceService.registerForTalk(req.params.talkId, req.user.id);
  res.status(201).json(result);
}

export async function cancel(req, res) {
  const result = await attendanceService.cancelRegistration(req.params.talkId, req.user.id);
  res.status(200).json(result);
}

export async function listMine(req, res) {
  const result = await attendanceService.listMyRegistrations(req.user.id);
  res.status(200).json(result);
}

export async function listByTalk(req, res) {
  const result = await attendanceService.listTalkRegistrations(
    req.params.talkId,
    req.validatedQuery,
  );
  res.status(200).json(result);
}

export async function qr(req, res) {
  const result = await attendanceService.getTalkQr(req.params.talkId);
  res.status(200).json(result);
}

export async function checkIn(req, res) {
  const result = await attendanceService.checkIn(req.params.talkId, req.user.id, req.body.token);
  res.status(200).json(result);
}

export async function setAttendance(req, res) {
  const result = await attendanceService.setAttendance(
    req.params.talkId,
    req.body.userId,
    req.body.attended,
  );
  res.status(200).json(result);
}
