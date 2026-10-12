import { Op } from 'sequelize';
import { User, Role, TOKEN_TYPES, USER_STATUSES } from '../../db/models/index.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { AppError } from '../../middlewares/error.js';
import { revokeAllUserTokens } from '../../services/token.service.js';

const roleInclude = { association: 'role', attributes: ['id', 'name'] };

async function resolveRoleId(roleName) {
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    throw new AppError('Rol inválido', 400, 'INVALID_ROLE');
  }
  return role.id;
}

async function findUserOrFail(id, options = {}) {
  const user = await User.findByPk(id, options);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }
  return user;
}

export async function getProfile(userId) {
  const user = await findUserOrFail(userId, { include: [roleInclude] });
  return user.toPublicJSON();
}

export async function updateProfile(userId, data) {
  const user = await findUserOrFail(userId, { include: [roleInclude] });
  await user.update(data);
  return user.toPublicJSON();
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await findUserOrFail(userId);

  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new AppError('La contraseña actual es incorrecta', 400, 'INVALID_CURRENT_PASSWORD');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await revokeAllUserTokens(user.id, TOKEN_TYPES.refresh);

  return { success: true };
}

export async function listUsers(query) {
  const { page, pageSize, role, status, search } = query;
  const where = {};

  if (role) {
    where.roleId = await resolveRoleId(role);
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [roleInclude],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  return {
    data: rows.map((user) => user.toPublicJSON()),
    meta: {
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize) || 1,
    },
  };
}

export async function getUser(id) {
  const user = await findUserOrFail(id, { include: [roleInclude] });
  return user.toPublicJSON();
}

export async function createUser(data) {
  const existing = await User.findOne({ where: { email: data.email } });
  if (existing) {
    throw new AppError('El correo ya está registrado', 409, 'EMAIL_IN_USE');
  }

  const roleId = await resolveRoleId(data.role);
  const status = data.status ?? USER_STATUSES.active;
  const passwordHash = await hashPassword(data.password);

  const user = await User.create({
    name: data.name,
    lastName: data.lastName,
    email: data.email,
    passwordHash,
    entity: data.entity ?? null,
    educationLevel: data.educationLevel ?? null,
    phone: data.phone ?? null,
    roleId,
    status,
    emailVerifiedAt: status === USER_STATUSES.active ? new Date() : null,
  });

  await user.reload({ include: [roleInclude] });
  return user.toPublicJSON();
}

export async function updateUser(id, data) {
  const user = await findUserOrFail(id, { include: [roleInclude] });

  if (data.email && data.email !== user.email) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      throw new AppError('El correo ya está registrado', 409, 'EMAIL_IN_USE');
    }
  }

  const updates = { ...data };
  if (updates.role) {
    updates.roleId = await resolveRoleId(updates.role);
  }
  delete updates.role;

  if (updates.status === USER_STATUSES.active) {
    updates.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
  }
  if (updates.status && updates.status !== USER_STATUSES.active) {
    await revokeAllUserTokens(user.id, TOKEN_TYPES.refresh);
  }

  await user.update(updates);
  await user.reload({ include: [roleInclude] });
  return user.toPublicJSON();
}

export async function updateStatus(id, status) {
  const user = await findUserOrFail(id, { include: [roleInclude] });

  const updates = { status };
  if (status === USER_STATUSES.active) {
    updates.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
  }
  if (status !== USER_STATUSES.active) {
    await revokeAllUserTokens(user.id, TOKEN_TYPES.refresh);
  }

  await user.update(updates);
  await user.reload({ include: [roleInclude] });
  return user.toPublicJSON();
}

export async function deleteUser(id, requesterId) {
  if (Number(id) === Number(requesterId)) {
    throw new AppError('No puedes eliminar tu propia cuenta', 400, 'CANNOT_DELETE_SELF');
  }

  const user = await findUserOrFail(id);
  await user.destroy();

  return { success: true };
}
