import { Op } from 'sequelize';
import { Location, Talk } from '../../db/models/index.js';
import { AppError } from '../../middlewares/error.js';

function serialize(location) {
  const data = location.toJSON();
  return {
    id: data.id,
    name: data.name,
    building: data.building,
    capacity: data.capacity,
    address: data.address,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function findLocationOrFail(id) {
  const location = await Location.findByPk(id);
  if (!location) {
    throw new AppError('Ubicación no encontrada', 404, 'LOCATION_NOT_FOUND');
  }
  return location;
}

export async function listLocations(query) {
  const { page, pageSize, search } = query;
  const where = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { building: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Location.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    data: rows.map(serialize),
    meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 1 },
  };
}

export async function getLocation(id) {
  const location = await findLocationOrFail(id);
  return serialize(location);
}

export async function createLocation(data) {
  const location = await Location.create({
    name: data.name,
    building: data.building ?? null,
    capacity: data.capacity ?? null,
    address: data.address ?? null,
  });
  return serialize(location);
}

export async function updateLocation(id, data) {
  const location = await findLocationOrFail(id);

  const updates = {};
  for (const field of ['name', 'building', 'capacity', 'address']) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  await location.update(updates);
  return serialize(location);
}

export async function deleteLocation(id) {
  const location = await findLocationOrFail(id);

  const talks = await Talk.count({ where: { locationId: id } });
  if (talks > 0) {
    throw new AppError(
      'No se puede eliminar: la ubicación tiene ponencias asignadas',
      409,
      'LOCATION_IN_USE',
    );
  }

  await location.destroy();
  return { success: true };
}
