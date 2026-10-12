import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const TOKEN_TYPES = {
  emailVerification: 'email_verification',
  passwordReset: 'password_reset',
  refresh: 'refresh',
};

export class Token extends Model {}

Token.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TOKEN_TYPES)),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Token',
    tableName: 'tokens',
    underscored: true,
    updatedAt: false,
  },
);
