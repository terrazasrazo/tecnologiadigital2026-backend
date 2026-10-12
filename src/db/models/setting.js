import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const SETTING_KEYS = {
  certificateMetric: 'certificate.metric',
  certificateMinTalks: 'certificate.minTalks',
  certificateMinHours: 'certificate.minHours',
};

export class Setting extends Model {}

Setting.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    underscored: true,
  },
);
