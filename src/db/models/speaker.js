import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Speaker extends Model {}

Speaker.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    academicDegree: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    institution: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photoPath: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Speaker',
    tableName: 'speakers',
    underscored: true,
  },
);
