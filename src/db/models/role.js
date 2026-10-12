import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const ROLE_NAMES = {
  admin: 'admin',
  organizador: 'organizador',
  ponente: 'ponente',
  asistente: 'asistente',
};

export class Role extends Model {}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    underscored: true,
  },
);
