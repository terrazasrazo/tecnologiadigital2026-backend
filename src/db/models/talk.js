import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const TALK_STATUSES = Object.freeze({
  scheduled: 'scheduled',
  cancelled: 'cancelled',
});

export class Talk extends Model {}

Talk.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    locationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TALK_STATUSES)),
      allowNull: false,
      defaultValue: TALK_STATUSES.scheduled,
    },
    attendanceOpensAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    attendanceClosesAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    qrSecret: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Talk',
    tableName: 'talks',
    underscored: true,
  },
);
