import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const REGISTRATION_STATUSES = Object.freeze({
  registered: 'registered',
  attended: 'attended',
  cancelled: 'cancelled',
});

export class TalkRegistration extends Model {}

TalkRegistration.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    talkId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(REGISTRATION_STATUSES)),
      allowNull: false,
      defaultValue: REGISTRATION_STATUSES.registered,
    },
    registeredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    attendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'TalkRegistration',
    tableName: 'talk_registrations',
    underscored: true,
    indexes: [{ unique: true, fields: ['talk_id', 'user_id'] }],
  },
);
