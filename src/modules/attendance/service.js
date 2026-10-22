import { Op } from 'sequelize';
import crypto from 'node:crypto';
import {
  Talk,
  User,
  TalkRegistration,
  REGISTRATION_STATUSES,
  TALK_STATUSES,
} from '../../db/models/index.js';
import { SETTING_KEYS } from '../../db/models/setting.js';
import { signTalkToken, verifyTalkToken } from '../../utils/jwt.js';
import { toDateTime, addMinutes } from '../../utils/time.js';
import { getNumberSetting } from '../../services/settings.service.js';
import { sendMailSafe } from '../../services/mailer.service.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/error.js';
import QRCode from 'qrcode';

function serializeTalkSummary(talk) {
  if (!talk) return null;
  const data = typeof talk.toJSON === 'function' ? talk.toJSON() : talk;
  return {
    id: data.id,
    title: data.title,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status,
    location: data.location ? { id: data.location.id, name: data.location.name } : null,
  };
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

function serializeRegistration(registration) {
  const data = registration.toJSON();
  const result = {
    id: data.id,
    talkId: data.talkId,
    userId: data.userId,
    status: data.status,
    registeredAt: data.registeredAt,
    attendedAt: data.attendedAt,
  };
  if (data.talk) result.talk = serializeTalkSummary(data.talk);
  if (data.user) result.user = serializeUser(data.user);
  return result;
}

async function findTalkOrFail(talkId) {
  const talk = await Talk.findByPk(talkId);
  if (!talk) {
    throw new AppError('Ponencia no encontrada', 404, 'TALK_NOT_FOUND');
  }
  return talk;
}

async function resolveWindow(talk) {
  const opensBefore = await getNumberSetting(SETTING_KEYS.attendanceOpensBeforeEndMinutes, 20);
  const closesAfter = await getNumberSetting(SETTING_KEYS.attendanceClosesAfterEndMinutes, 10);
  const end = toDateTime(talk.date, talk.endTime, config.events.timezoneOffsetMinutes);

  return {
    opensAt: talk.attendanceOpensAt
      ? new Date(talk.attendanceOpensAt)
      : addMinutes(end, -opensBefore),
    closesAt: talk.attendanceClosesAt
      ? new Date(talk.attendanceClosesAt)
      : addMinutes(end, closesAfter),
  };
}

export async function registerForTalk(talkId, userId) {
  const talk = await findTalkOrFail(talkId);
  if (talk.status === TALK_STATUSES.cancelled) {
    throw new AppError('La ponencia está cancelada', 409, 'TALK_CANCELLED');
  }

  const { closesAt } = await resolveWindow(talk);
  if (Date.now() > closesAt.getTime()) {
    throw new AppError('El periodo de inscripción ha finalizado', 409, 'REGISTRATION_CLOSED');
  }

  let registration = await TalkRegistration.findOne({ where: { talkId: talk.id, userId } });
  if (registration && registration.status !== REGISTRATION_STATUSES.cancelled) {
    throw new AppError('Ya estás inscrito en esta ponencia', 409, 'ALREADY_REGISTERED');
  }

  if (registration) {
    await registration.update({
      status: REGISTRATION_STATUSES.registered,
      registeredAt: new Date(),
      attendedAt: null,
    });
  } else {
    registration = await TalkRegistration.create({
      talkId: talk.id,
      userId,
      status: REGISTRATION_STATUSES.registered,
      registeredAt: new Date(),
    });
  }

  return serializeRegistration(registration);
}

export async function cancelRegistration(talkId, userId) {
  const registration = await TalkRegistration.findOne({ where: { talkId, userId } });
  if (!registration || registration.status === REGISTRATION_STATUSES.cancelled) {
    throw new AppError('No estás inscrito en esta ponencia', 404, 'REGISTRATION_NOT_FOUND');
  }
  if (registration.status === REGISTRATION_STATUSES.attended) {
    throw new AppError(
      'No puedes cancelar una asistencia ya registrada',
      409,
      'CANNOT_CANCEL_ATTENDED',
    );
  }

  await registration.update({ status: REGISTRATION_STATUSES.cancelled });
  return { success: true };
}

export async function listMyRegistrations(userId) {
  const registrations = await TalkRegistration.findAll({
    where: { userId, status: { [Op.ne]: REGISTRATION_STATUSES.cancelled } },
    include: [{ association: 'talk', include: [{ association: 'location' }] }],
    order: [['registeredAt', 'DESC']],
  });

  return { data: registrations.map(serializeRegistration) };
}

export async function listTalkRegistrations(talkId, query) {
  await findTalkOrFail(talkId);
  const { page, pageSize, status } = query;

  const where = { talkId };
  if (status) where.status = status;

  const { rows, count } = await TalkRegistration.findAndCountAll({
    where,
    include: [{ association: 'user' }],
    order: [['registeredAt', 'ASC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    data: rows.map(serializeRegistration),
    meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 1 },
  };
}

export async function getTalkQr(talkId) {
  const talk = await findTalkOrFail(talkId);
  if (!talk.qrSecret) {
    await talk.update({ qrSecret: crypto.randomBytes(24).toString('hex') });
  }

  const window = await resolveWindow(talk);
  return {
    talkId: talk.id,
    token: signTalkToken(talk),
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
  };
}

/**
 * Envía el QR de asistencia de la ponencia por correo a los ponentes
 * asociados (a las cuentas de usuario vinculadas). Devuelve cuántos
 * correos se enviaron de entre los destinatarios posibles.
 */
export async function emailTalkQrToSpeakers(talkId) {
  const talk = await findTalkOrFail(talkId);
  if (!talk.qrSecret) {
    await talk.update({ qrSecret: crypto.randomBytes(24).toString('hex') });
  }

  const speakers = await talk.getSpeakers();
  const userIds = [...new Set(speakers.map((speaker) => speaker.userId).filter(Boolean))];
  const users = userIds.length
    ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'email'] })
    : [];
  const emails = [...new Set(users.map((user) => user.email).filter(Boolean))];
  if (emails.length === 0) {
    throw new AppError(
      'La ponencia no tiene ponentes con correo electrónico asociado',
      400,
      'SPEAKERS_WITHOUT_EMAIL',
    );
  }

  const token = signTalkToken(talk);
  const png = await QRCode.toBuffer(token, {
    width: 320,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
  const context = {
    talkTitle: talk.title,
    talkDate: talk.date,
    talkTime: `${String(talk.startTime).slice(0, 5)}–${String(talk.endTime).slice(0, 5)}`,
  };

  let sent = 0;
  for (const email of emails) {
    const info = await sendMailSafe({
      to: email,
      subject: `Código de asistencia — ${talk.title}`,
      template: 'talk-qr',
      context,
      attachments: [
        { filename: `qr-asistencia-ponencia-${talk.id}.png`, content: png, cid: 'qr' },
      ],
    });
    if (info) {
      sent += 1;
    }
  }

  return { sent, recipients: emails.length };
}

export async function checkIn(talkId, userId, token) {
  const talk = await findTalkOrFail(talkId);
  if (talk.status === TALK_STATUSES.cancelled) {
    throw new AppError('La ponencia está cancelada', 409, 'TALK_CANCELLED');
  }

  let payload;
  try {
    payload = verifyTalkToken(token, talk);
  } catch {
    throw new AppError('Código QR inválido o expirado', 400, 'INVALID_QR');
  }
  if (Number(payload.talkId) !== Number(talk.id)) {
    throw new AppError('El código QR no corresponde a esta ponencia', 400, 'INVALID_QR');
  }

  const window = await resolveWindow(talk);
  const now = Date.now();
  if (now < window.opensAt.getTime()) {
    throw new AppError('El registro de asistencia aún no está abierto', 409, 'ATTENDANCE_NOT_OPEN');
  }
  if (now > window.closesAt.getTime()) {
    throw new AppError('El registro de asistencia ya cerró', 409, 'ATTENDANCE_CLOSED');
  }

  const [registration] = await TalkRegistration.findOrCreate({
    where: { talkId: talk.id, userId },
    defaults: { status: REGISTRATION_STATUSES.registered, registeredAt: new Date() },
  });

  if (registration.status === REGISTRATION_STATUSES.attended) {
    return { alreadyAttended: true, registration: serializeRegistration(registration) };
  }

  await registration.update({
    status: REGISTRATION_STATUSES.attended,
    attendedAt: new Date(),
  });

  return { alreadyAttended: false, registration: serializeRegistration(registration) };
}

export async function setAttendance(talkId, targetUserId, attended) {
  const talk = await findTalkOrFail(talkId);

  const user = await User.findByPk(targetUserId);
  if (!user) {
    throw new AppError('El usuario indicado no existe', 404, 'USER_NOT_FOUND');
  }

  const [registration] = await TalkRegistration.findOrCreate({
    where: { talkId: talk.id, userId: targetUserId },
    defaults: { status: REGISTRATION_STATUSES.registered, registeredAt: new Date() },
  });

  await registration.update({
    status: attended ? REGISTRATION_STATUSES.attended : REGISTRATION_STATUSES.registered,
    attendedAt: attended ? new Date() : null,
  });

  return serializeRegistration(registration);
}
