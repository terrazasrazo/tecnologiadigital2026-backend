'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certificates', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      file_path: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      talks_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      hours_total: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },
      threshold_snapshot: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('certificates', ['code'], {
      name: 'certificates_code_unique',
      unique: true,
    });
    await queryInterface.addIndex('certificates', ['user_id'], {
      name: 'certificates_user_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('certificates');
  },
};
