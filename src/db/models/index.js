import { Sequelize } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Role } from './role.js';
import { User } from './user.js';
import { Token } from './token.js';
import { Setting } from './setting.js';

Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

User.hasMany(Token, { foreignKey: 'userId', as: 'tokens' });
Token.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export const db = {
  sequelize,
  Sequelize,
  Role,
  User,
  Token,
  Setting,
};

export { sequelize, Sequelize, Role, User, Token, Setting };

export { ROLE_NAMES } from './role.js';
export { USER_STATUSES } from './user.js';
export { TOKEN_TYPES } from './token.js';
export { SETTING_KEYS } from './setting.js';

export default db;
