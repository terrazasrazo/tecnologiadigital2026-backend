import { fn, col, literal, Op } from 'sequelize';
import {
  User,
  Role,
  Speaker,
  Location,
  Talk,
  TalkRegistration,
  Certificate,
  TALK_STATUSES,
  REGISTRATION_STATUSES,
} from '../../db/models/index.js';

function countPairs(rows, labelKey) {
  return rows.map((row) => ({
    [labelKey]: row[labelKey],
    count: Number(row.count),
  }));
}

/**
 * Estadísticas generales para el panel de administración:
 * usuarios (totales, por estado/rol/entidad/nivel), ponencias, asistencia y
 * constancias, más el desglose de registros por ponencia para las gráficas.
 */
export async function getStats() {
  const [
    usersTotal,
    usersByStatus,
    usersByRole,
    usersByEntity,
    usersByEducation,
    speakersTotal,
    locationsTotal,
    talksTotal,
    talksByStatus,
    certificatesTotal,
    registrationsByStatus,
    talks,
    registrationsByTalk,
  ] = await Promise.all([
    User.count(),
    User.count({ group: ['status'] }),
    User.count({ group: ['roleId'] }),
    User.findAll({
      attributes: ['entity', [fn('COUNT', col('id')), 'count']],
      where: { entity: { [Op.ne]: null } },
      group: ['entity'],
      order: [[literal('count'), 'DESC']],
      limit: 8,
      raw: true,
    }),
    User.findAll({
      attributes: ['educationLevel', [fn('COUNT', col('id')), 'count']],
      where: { educationLevel: { [Op.ne]: null } },
      group: ['educationLevel'],
      order: [[literal('count'), 'DESC']],
      limit: 8,
      raw: true,
    }),
    Speaker.count(),
    Location.count(),
    Talk.count(),
    Talk.count({ group: ['status'] }),
    Certificate.count(),
    TalkRegistration.count({ group: ['status'] }),
    Talk.findAll({
      attributes: ['id', 'title', 'date', 'startTime', 'endTime', 'status'],
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC'],
      ],
      raw: true,
    }),
    TalkRegistration.findAll({
      attributes: ['talkId', 'status', [fn('COUNT', col('id')), 'count']],
      group: ['talkId', 'status'],
      raw: true,
    }),
  ]);

  const roles = await Role.findAll({ attributes: ['id', 'name'], raw: true });
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

  const statusCount = (rows, status) =>
    Number(rows.find((row) => row.status === status)?.count ?? 0);

  const byStatusTotal = (rows) =>
    rows.reduce((sum, row) => sum + Number(row.count), 0);

  const registeredTotal =
    byStatusTotal(registrationsByStatus) - statusCount(registrationsByStatus, 'cancelled');
  const attendedTotal = statusCount(registrationsByStatus, 'attended');

  // Registros agrupados por ponencia: { talkId: { registered, attended } }
  const perTalkMap = new Map();
  for (const row of registrationsByTalk) {
    const entry = perTalkMap.get(row.talkId) ?? { registered: 0, attended: 0 };
    const count = Number(row.count);
    if (row.status !== REGISTRATION_STATUSES.cancelled) entry.registered += count;
    if (row.status === REGISTRATION_STATUSES.attended) entry.attended += count;
    perTalkMap.set(row.talkId, entry);
  }

  return {
    users: {
      total: usersTotal,
      active: statusCount(usersByStatus, 'active'),
      pending: statusCount(usersByStatus, 'pending'),
      inactive: statusCount(usersByStatus, 'inactive'),
      byRole: usersByRole.map((row) => ({
        role: roleNameById.get(row.roleId) ?? 'desconocido',
        count: Number(row.count),
      })),
      byEntity: countPairs(usersByEntity, 'entity'),
      byEducationLevel: countPairs(usersByEducation, 'educationLevel'),
    },
    speakers: { total: speakersTotal },
    locations: { total: locationsTotal },
    talks: {
      total: talksTotal,
      byStatus: countPairs(talksByStatus, 'status'),
    },
    certificates: { total: certificatesTotal },
    attendance: {
      registered: registeredTotal,
      attended: attendedTotal,
      rate: registeredTotal > 0 ? Math.round((attendedTotal / registeredTotal) * 100) : 0,
    },
    perTalk: talks
      .filter((talk) => talk.status !== TALK_STATUSES.cancelled)
      .map((talk) => {
        const counts = perTalkMap.get(talk.id) ?? { registered: 0, attended: 0 };
        return {
          id: talk.id,
          title: talk.title,
          date: talk.date,
          startTime: talk.startTime,
          endTime: talk.endTime,
          status: talk.status,
          registered: counts.registered,
          attended: counts.attended,
        };
      }),
  };
}
