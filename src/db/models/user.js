import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const USER_STATUSES = {
  pending: 'pending',
  active: 'active',
  inactive: 'inactive',
};

export class User extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      lastName: this.lastName,
      email: this.email,
      entity: this.entity,
      educationLevel: this.educationLevel,
      phone: this.phone,
      status: this.status,
      emailVerifiedAt: this.emailVerifiedAt,
      role: this.role ? { id: this.role.id, name: this.role.name } : undefined,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    entity: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    educationLevel: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    roleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(USER_STATUSES)),
      allowNull: false,
      defaultValue: USER_STATUSES.pending,
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
  },
);
