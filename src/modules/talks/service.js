import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { Talk, Speaker, Location, TALK_STATUSES, SETTING_KEYS } from '../../db/models/index.js';
import { storage } from '../../services/storage.service.js';
import { getNumberSetting } from '../../services/settings.service.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/error.js';
import { durationMinutes, rangesOverlap, toDateTime, addMinutes } from '../../utils/time.js';

const include = [
  { association: 'location' },
  { association: 'speakers', through: { attributes: [] } },
];

function serializeSpeaker(speaker) {
  return {
    id: speaker.id,
    name: speaker.name,
    academicDegree: speaker.academicDegree,
    institution: speaker.institution,
    photoUrl: storage.url(speaker.photoPath),
  };
}

function serialize(talk) {
  const data = talk.toJSON();
  const opensAt = data.attendanceOpensAt ? new Date(data.attendanceOpensAt) : null;
  const closesAt = data.attendanceClosesAt ? new Date(data.attendanceClosesAt) : null;
  const now = Date.now();

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    durationMinutes: durationMinutes(data.startTime, data.endTime),
    status: data.status,
    location: data.location
      ? {
          id: data.location.id,
          name: data.location.name,
          building: data.location.building,
          capacity: data.location.capacity,
          address: data.location.address,
        }
      : null,
    speakers: (data.speakers ?? []).map(serializeSpeaker),
    attendanceWindow: {
      opensAt: opensAt ? opensAt.toISOString() : null,
      closesAt: closesAt ? closesAt.toISOString() : null,
      isOpen: Boolean(opensAt && closesAt && now >= opensAt.getTime() && now <= closesAt.getTime()),
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function findTalkOrFail(id) {
  const talk = await Talk.findByPk(id, { include });
  if (!talk) {
    throw new AppError('Ponencia no encontrada', 404, 'TALK_NOT_FOUND');
  }
  return talk;
}

async function assertLocationExists(locationId) {
  if (!locationId) return;
  const location = await Location.findByPk(locationId);
  if (!location) {
    throw new AppError('La ubicación indicada no existe', 400, 'LOCATION_NOT_FOUND');
  }
}

async function resolveSpeakers(speakerIds) {
  if (!speakerIds || speakerIds.length === 0) return null;
  const unique = [...new Set(speakerIds)];
  const found = await Speaker.findAll({ where: { id: { [Op.in]: unique } } });
  if (found.length !== unique.length) {
    throw new AppError('Uno o más ponentes no existen', 400, 'SPEAKER_NOT_FOUND');
  }
  return unique;
}

async function assertNoOverlap({ locationId, date, startTime, endTime, status, excludeId }) {
  if (!locationId || status === TALK_STATUSES.cancelled) return;

  const where = { locationId, date, status: { [Op.ne]: TALK_STATUSES.cancelled } };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const candidates = await Talk.findAll({ where });
  const conflict = candidates.find((talk) =>
    rangesOverlap(startTime, endTime, talk.startTime, talk.endTime),
  );

  if (conflict) {
    throw new AppError(
      `La ubicación ya tiene una ponencia en ese horario: "${conflict.title}"`,
      409,
      'TALK_TIME_CONFLICT',
    );
  }
}

async function resolveAttendanceWindow({ date, endTime, opensAt, closesAt }) {
  const opensBefore = await getNumberSetting(SETTING_KEYS.attendanceOpensBeforeEndMinutes, 20);
  const closesAfter = await getNumberSetting(SETTING_KEYS.attendanceClosesAfterEndMinutes, 10);
  const end = toDateTime(date, endTime, config.events.timezoneOffsetMinutes);

  return {
    attendanceOpensAt: opensAt ? new Date(opensAt) : addMinutes(end, -opensBefore),
    attendanceClosesAt: closesAt ? new Date(closesAt) : addMinutes(end, closesAfter),
  };
}

export async function listTalks(query) {
  const { page, pageSize, search, date, locationId, status } = query;
  const where = {};

  if (date) where.date = date;
  if (locationId) where.locationId = locationId;
  if (status) where.status = status;
  if (search) where.title = { [Op.like]: `%${search}%` };

  const { rows, count } = await Talk.findAndCountAll({
    where,
    include,
    order: [
      ['date', 'ASC'],
      ['startTime', 'ASC'],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  return {
    data: rows.map(serialize),
    meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 1 },
  };
}

export async function getTalk(id) {
  const talk = await findTalkOrFail(id);
  return serialize(talk);
}

export async function createTalk(data, requester) {
  await assertLocationExists(data.locationId);
  const speakerIds = await resolveSpeakers(data.speakerIds);
  const status = data.status ?? TALK_STATUSES.scheduled;

  await assertNoOverlap({
    locationId: data.locationId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    status,
  });

  const window = await resolveAttendanceWindow({
    date: data.date,
    endTime: data.endTime,
    opensAt: data.attendanceOpensAt,
    closesAt: data.attendanceClosesAt,
  });

  const talk = await Talk.create({
    title: data.title,
    description: data.description ?? null,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    locationId: data.locationId ?? null,
    status,
    ...window,
    qrSecret: crypto.randomBytes(24).toString('hex'),
    createdBy: requester.id,
  });

  if (speakerIds) {
    await talk.setSpeakers(speakerIds);
  }

  return serialize(await findTalkOrFail(talk.id));
}

export async function updateTalk(id, data, _requester) {
  const talk = await findTalkOrFail(id);

  const updates = {};
  for (const field of ['title', 'description', 'date', 'startTime', 'endTime', 'status']) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }
  if (data.locationId !== undefined) {
    updates.locationId = data.locationId ?? null;
  }

  if (
    data.attendanceOpensAt !== undefined ||
    data.attendanceClosesAt !== undefined ||
    updates.date !== undefined ||
    updates.endTime !== undefined
  ) {
    const window = await resolveAttendanceWindow({
      date: updates.date ?? talk.date,
      endTime: updates.endTime ?? talk.endTime,
      opensAt: data.attendanceOpensAt,
      closesAt: data.attendanceClosesAt,
    });
    updates.attendanceOpensAt = window.attendanceOpensAt;
    updates.attendanceClosesAt = window.attendanceClosesAt;
  }

  if (!talk.qrSecret) {
    updates.qrSecret = crypto.randomBytes(24).toString('hex');
  }

  const nextStart = updates.startTime ?? talk.startTime;
  const nextEnd = updates.endTime ?? talk.endTime;
  if (!(durationMinutes(nextStart, nextEnd) > 0)) {
    throw new AppError(
      'La hora de término debe ser posterior a la de inicio',
      400,
      'INVALID_TIME_RANGE',
    );
  }

  if (updates.locationId !== undefined) {
    await assertLocationExists(updates.locationId);
  }

  await assertNoOverlap({
    locationId: updates.locationId ?? talk.locationId,
    date: updates.date ?? talk.date,
    startTime: nextStart,
    endTime: nextEnd,
    status: updates.status ?? talk.status,
    excludeId: talk.id,
  });

  await talk.update(updates);

  if (data.speakerIds !== undefined) {
    const speakerIds = await resolveSpeakers(data.speakerIds);
    await talk.setSpeakers(speakerIds ?? []);
  }

  return serialize(await findTalkOrFail(talk.id));
}

export async function deleteTalk(id) {
  const talk = await findTalkOrFail(id);
  await talk.destroy();
  return { success: true };
}
