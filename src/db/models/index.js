import { Sequelize } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Role } from './role.js';
import { User } from './user.js';
import { Token } from './token.js';
import { Setting } from './setting.js';
import { Speaker } from './speaker.js';
import { Location } from './location.js';
import { Talk } from './talk.js';
import { TalkRegistration } from './talk-registration.js';

Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

User.hasMany(Token, { foreignKey: 'userId', as: 'tokens' });
Token.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Speaker, { foreignKey: 'userId', as: 'speakerProfile' });
Speaker.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Location.hasMany(Talk, { foreignKey: 'locationId', as: 'talks' });
Talk.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });

User.hasMany(Talk, { foreignKey: 'createdBy', as: 'createdTalks' });
Talk.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Talk.belongsToMany(Speaker, {
  through: 'talk_speakers',
  foreignKey: 'talkId',
  otherKey: 'speakerId',
  as: 'speakers',
  timestamps: false,
});
Speaker.belongsToMany(Talk, {
  through: 'talk_speakers',
  foreignKey: 'speakerId',
  otherKey: 'talkId',
  as: 'talks',
  timestamps: false,
});

Talk.hasMany(TalkRegistration, { foreignKey: 'talkId', as: 'registrations' });
TalkRegistration.belongsTo(Talk, { foreignKey: 'talkId', as: 'talk' });

User.hasMany(TalkRegistration, { foreignKey: 'userId', as: 'registrations' });
TalkRegistration.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export const db = {
  sequelize,
  Sequelize,
  Role,
  User,
  Token,
  Setting,
  Speaker,
  Location,
  Talk,
  TalkRegistration,
};

export {
  sequelize,
  Sequelize,
  Role,
  User,
  Token,
  Setting,
  Speaker,
  Location,
  Talk,
  TalkRegistration,
};

export { ROLE_NAMES } from './role.js';
export { USER_STATUSES } from './user.js';
export { TOKEN_TYPES } from './token.js';
export { SETTING_KEYS } from './setting.js';
export { TALK_STATUSES } from './talk.js';
export { REGISTRATION_STATUSES } from './talk-registration.js';

export default db;
