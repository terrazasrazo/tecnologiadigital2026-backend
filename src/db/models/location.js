import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Location extends Model {}

Location.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    building: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    capacity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Location',
    tableName: 'locations',
    underscored: true,
  },
);
