import crypto from 'node:crypto';
import { Op } from 'sequelize';
import {
  Certificate,
  Talk,
  TalkRegistration,
  User,
  REGISTRATION_STATUSES,
  TALK_STATUSES,
} from '../../db/models/index.js';
import { SETTING_KEYS } from '../../db/models/setting.js';
import { getNumberSetting, getStringSetting } from '../../services/settings.service.js';
import { renderTemplate } from '../../services/mailer.service.js';
import { sendCertificateEmail } from '../../services/notifications.service.js';
import { renderPdf } from '../../services/pdf.service.js';
import { documentStore } from '../../services/documentStore.service.js';
import { durationMinutes } from '../../utils/time.js';
import { AppError } from '../../middlewares/error.js';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function parseDateOnly(dateOnly) {
  return new Date(`${dateOnly}T00:00:00Z`);
}

function formatDateLabel(dateOnly) {
  return dateFormatter.format(parseDateOnly(dateOnly));
}

function formatScheduleLabel(startTime, endTime) {
  return `${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}`;
}

function formatDurationLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} h ${rest} min`;
  if (hours) return `${hours} h`;
  return `${rest} min`;
}

function formatHoursLabel(hours) {
  return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
}

function roundHours(minutes) {
  return Math.round((minutes / 60) * 100) / 100;
}

function serializeUser(user) {
  if (!user) return null;
  const data = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return {
    id: data.id,
    name: data.name,
    lastName: data.lastName,
    email: data.email,
  };
}

export function serializeCertificate(certificate, user) {
  const data = typeof certificate.toJSON === 'function' ? certificate.toJSON() : certificate;
  const certificateUser = user || data.user;

  return {
    id: data.id,
    userId: data.userId,
    code: data.code,
    issuedAt: data.issuedAt,
    talksCount: data.talksCount,
    hoursTotal: Number(data.hoursTotal),
    threshold: data.thresholdSnapshot ? JSON.parse(data.thresholdSnapshot) : null,
    downloadUrl: `/api/certificates/${data.id}/download`,
    ...(certificateUser ? { user: serializeUser(certificateUser) } : {}),
  };
}

async function getAttendedTalks(userId) {
  const registrations = await TalkRegistration.findAll({
    where: { userId, status: REGISTRATION_STATUSES.attended },
    include: [
      {
        association: 'talk',
        required: true,
        where: { status: { [Op.ne]: TALK_STATUSES.cancelled } },
        include: [{ association: 'location' }],
      },
    ],
    order: [
      [{ model: Talk, as: 'talk' }, 'date', 'ASC'],
      [{ model: Talk, as: 'talk' }, 'startTime', 'ASC'],
    ],
  });

  return registrations.map((registration) => {
    const talk = registration.talk.toJSON();
    return {
      id: talk.id,
      title: talk.title,
      date: talk.date,
      startTime: talk.startTime,
      endTime: talk.endTime,
      durationMinutes: durationMinutes(talk.startTime, talk.endTime),
      location: talk.location ? { id: talk.location.id, name: talk.location.name } : null,
    };
  });
}

export async function getEligibility(userId) {
  const talks = await getAttendedTalks(userId);
  const minutesTotal = talks.reduce((sum, talk) => sum + talk.durationMinutes, 0);
  const hoursTotal = roundHours(minutesTotal);
  const talksCount = talks.length;

  const metric = (await getStringSetting(SETTING_KEYS.certificateMetric, 'talks')).toLowerCase();
  const minTalks = await getNumberSetting(SETTING_KEYS.certificateMinTalks, 1);
  const minHours = await getNumberSetting(SETTING_KEYS.certificateMinHours, 0);

  let eligible;
  if (metric === 'hours') {
    eligible = hoursTotal >= minHours;
  } else if (metric === 'both') {
    eligible = talksCount >= minTalks && hoursTotal >= minHours;
  } else {
    eligible = talksCount >= minTalks;
  }

  return {
    eligible,
    metric,
    talksCount,
    hoursTotal,
    minutesTotal,
    threshold: { minTalks, minHours },
    talks,
  };
}

function generateCode() {
  const year = new Date().getUTCFullYear();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TD-${year}-${random}`;
}

async function buildCertificateContext(user, eligibility, code, issuedAt) {
  const talks = eligibility.talks.map((talk) => ({
    title: talk.title,
    dateLabel: formatDateLabel(talk.date),
    scheduleLabel: formatScheduleLabel(talk.startTime, talk.endTime),
    durationLabel: formatDurationLabel(talk.durationMinutes),
  }));

  return {
    user: {
      name: user.name,
      lastName: user.lastName,
      entity: user.entity,
    },
    certificate: { code },
    issuedAtLabel: dateFormatter.format(issuedAt),
    totals: {
      talksCount: eligibility.talksCount,
      hoursValue: eligibility.hoursTotal,
      hoursLabel: formatHoursLabel(eligibility.hoursTotal),
      minutesTotal: eligibility.minutesTotal,
    },
    talks,
  };
}

export async function issueCertificate(userId, { sendEmail = true } = {}) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('El usuario indicado no existe', 404, 'USER_NOT_FOUND');
  }

  const eligibility = await getEligibility(user.id);
  if (!eligibility.eligible) {
    throw new AppError(
      'El usuario aún no cumple los requisitos para obtener su constancia',
      409,
      'NOT_ELIGIBLE',
      {
        metric: eligibility.metric,
        talksCount: eligibility.talksCount,
        hoursTotal: eligibility.hoursTotal,
        threshold: eligibility.threshold,
      },
    );
  }

  const issuedAt = new Date();
  const code = generateCode();
  const thresholdSnapshot = {
    metric: eligibility.metric,
    minTalks: eligibility.threshold.minTalks,
    minHours: eligibility.threshold.minHours,
    talksCount: eligibility.talksCount,
    hoursTotal: eligibility.hoursTotal,
  };

  const context = await buildCertificateContext(user, eligibility, code, issuedAt);
  const html = await renderTemplate('certificate-pdf', context);
  const pdf = await renderPdf(html);

  const filename = `constancia-${user.id}-${code}.pdf`;
  const existing = await Certificate.findOne({ where: { userId: user.id } });
  const previousFile = existing?.filePath;

  await documentStore.save(filename, pdf);

  let certificate;
  if (existing) {
    certificate = await existing.update({
      code,
      issuedAt,
      filePath: filename,
      talksCount: eligibility.talksCount,
      hoursTotal: eligibility.hoursTotal,
      thresholdSnapshot: JSON.stringify(thresholdSnapshot),
    });
  } else {
    certificate = await Certificate.create({
      userId: user.id,
      code,
      issuedAt,
      filePath: filename,
      talksCount: eligibility.talksCount,
      hoursTotal: eligibility.hoursTotal,
      thresholdSnapshot: JSON.stringify(thresholdSnapshot),
    });
  }

  if (previousFile && previousFile !== filename) {
    await documentStore.remove(previousFile);
  }

  if (sendEmail) {
    await sendCertificateEmail(user, { pdf, filename });
  }

  return { certificate: serializeCertificate(certificate, user), eligibility };
}

export async function getMyCertificate(userId) {
  const certificate = await Certificate.findOne({ where: { userId } });
  if (!certificate) {
    throw new AppError('Aún no tienes una constancia emitida', 404, 'CERTIFICATE_NOT_FOUND');
  }
  return serializeCertificate(certificate);
}

export async function getCertificateOrFail(id) {
  const certificate = await Certificate.findByPk(id, { include: [{ association: 'user' }] });
  if (!certificate) {
    throw new AppError('Constancia no encontrada', 404, 'CERTIFICATE_NOT_FOUND');
  }
  return certificate;
}

export async function readCertificateFile(certificate) {
  const exists = await documentStore.exists(certificate.filePath);
  if (!exists) {
    throw new AppError(
      'El archivo de la constancia no está disponible',
      404,
      'CERTIFICATE_FILE_MISSING',
    );
  }
  return documentStore.read(certificate.filePath);
}

export async function verifyCertificate(code) {
  const certificate = await Certificate.findOne({
    where: { code },
    include: [{ association: 'user' }],
  });
  if (!certificate) {
    throw new AppError('Constancia no encontrada', 404, 'CERTIFICATE_NOT_FOUND');
  }

  const data = certificate.toJSON();
  return {
    valid: true,
    code: data.code,
    holder: `${data.user.name} ${data.user.lastName}`,
    talksCount: data.talksCount,
    hoursTotal: Number(data.hoursTotal),
    issuedAt: data.issuedAt,
  };
}

export async function listCertificates({ page, pageSize, search }) {
  const where = {};
  const include = [{ association: 'user', required: true }];
  if (search) {
    const like = `%${search}%`;
    include[0].where = {
      [Op.or]: [
        { name: { [Op.like]: like } },
        { lastName: { [Op.like]: like } },
        { email: { [Op.like]: like } },
      ],
    };
  }

  const { rows, count } = await Certificate.findAndCountAll({
    where,
    include,
    order: [['issuedAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    data: rows.map((certificate) => serializeCertificate(certificate)),
    meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 1 },
  };
}
