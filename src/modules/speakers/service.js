import { Op } from 'sequelize';
import { Speaker, User, ROLE_NAMES } from '../../db/models/index.js';
import { storage } from '../../services/storage.service.js';
import { AppError } from '../../middlewares/error.js';

function serialize(speaker) {
  const data = speaker.toJSON();
  return {
    id: data.id,
    userId: data.userId,
    name: data.name,
    academicDegree: data.academicDegree,
    institution: data.institution,
    bio: data.bio,
    photoUrl: storage.url(data.photoPath),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function findSpeakerOrFail(id) {
  const speaker = await Speaker.findByPk(id);
  if (!speaker) {
    throw new AppError('Ponente no encontrado', 404, 'SPEAKER_NOT_FOUND');
  }
  return speaker;
}

function canManage(speaker, requester) {
  const isManager = [ROLE_NAMES.admin, ROLE_NAMES.organizador].includes(requester.role);
  const isOwner = speaker.userId !== null && speaker.userId === requester.id;
  return isManager || isOwner;
}

function assertCanManage(speaker, requester) {
  if (!canManage(speaker, requester)) {
    throw new AppError('No tienes permisos para gestionar este ponente', 403, 'FORBIDDEN');
  }
}

export async function listSpeakers(query) {
  const { page, pageSize, search } = query;
  const where = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { institution: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Speaker.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  return {
    data: rows.map(serialize),
    meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 1 },
  };
}

export async function getSpeaker(id) {
  const speaker = await findSpeakerOrFail(id);
  return serialize(speaker);
}

export async function createSpeaker(data, file) {
  if (data.userId) {
    const user = await User.findByPk(data.userId);
    if (!user) {
      throw new AppError('El usuario indicado no existe', 400, 'USER_NOT_FOUND');
    }
    const existing = await Speaker.findOne({ where: { userId: data.userId } });
    if (existing) {
      throw new AppError(
        'Ese usuario ya tiene un perfil de ponente',
        409,
        'SPEAKER_ALREADY_LINKED',
      );
    }
  }

  const speaker = await Speaker.create({
    name: data.name,
    academicDegree: data.academicDegree ?? null,
    institution: data.institution ?? null,
    bio: data.bio ?? null,
    userId: data.userId ?? null,
    photoPath: file ? storage.relativePath('speakers', file.filename) : null,
  });

  return serialize(speaker);
}

export async function updateSpeaker(id, data, file, requester) {
  const speaker = await findSpeakerOrFail(id);
  assertCanManage(speaker, requester);

  const updates = {};
  for (const field of ['name', 'academicDegree', 'institution', 'bio']) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  if (file) {
    const previousPhoto = speaker.photoPath;
    updates.photoPath = storage.relativePath('speakers', file.filename);
    if (previousPhoto) {
      await storage.remove(previousPhoto);
    }
  }

  await speaker.update(updates);
  return serialize(speaker);
}

export async function deleteSpeaker(id) {
  const speaker = await findSpeakerOrFail(id);
  if (speaker.photoPath) {
    await storage.remove(speaker.photoPath);
  }
  await speaker.destroy();
  return { success: true };
}

export async function removeSpeakerPhoto(id, requester) {
  const speaker = await findSpeakerOrFail(id);
  assertCanManage(speaker, requester);

  if (speaker.photoPath) {
    await storage.remove(speaker.photoPath);
  }
  await speaker.update({ photoPath: null });
  return serialize(speaker);
}
