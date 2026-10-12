import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Certificate extends Model {}

Certificate.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    issuedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    filePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    talksCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    hoursTotal: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    },
    thresholdSnapshot: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Certificate',
    tableName: 'certificates',
    underscored: true,
  },
);
