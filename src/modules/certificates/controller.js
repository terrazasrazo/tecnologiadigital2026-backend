import * as certificatesService from './service.js';
import { ROLE_NAMES } from '../../db/models/index.js';
import { AppError } from '../../middlewares/error.js';

export async function eligibility(req, res) {
  const result = await certificatesService.getEligibility(req.user.id);
  res.status(200).json(result);
}

export async function issue(req, res) {
  const result = await certificatesService.issueCertificate(req.user.id, {
    sendEmail: req.body.sendEmail,
  });
  res.status(201).json(result.certificate);
}

export async function issueForUser(req, res) {
  const result = await certificatesService.issueCertificate(req.params.userId, {
    sendEmail: req.body.sendEmail,
  });
  res.status(201).json(result.certificate);
}

export async function mine(req, res) {
  const result = await certificatesService.getMyCertificate(req.user.id);
  res.status(200).json(result);
}

export async function list(req, res) {
  const result = await certificatesService.listCertificates(req.validatedQuery);
  res.status(200).json(result);
}

export async function verify(req, res) {
  const result = await certificatesService.verifyCertificate(req.params.code);
  res.status(200).json(result);
}

export async function download(req, res) {
  const certificate = await certificatesService.getCertificateOrFail(req.params.id);

  const isOwner = Number(certificate.userId) === Number(req.user.id);
  const isManager = [ROLE_NAMES.admin, ROLE_NAMES.organizador].includes(req.user.role);

  if (!isOwner && !isManager) {
    throw new AppError('No puedes descargar la constancia de otro usuario', 403, 'FORBIDDEN');
  }

  const pdf = await certificatesService.readCertificateFile(certificate);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="constancia-${certificate.code}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.send(pdf);
}

export const roles = ROLE_NAMES;
