'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('speakers', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      academic_degree: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      institution: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      photo_path: {
        type: Sequelize.STRING(255),
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

    await queryInterface.addIndex('speakers', ['name'], { name: 'speakers_name_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('speakers');
  },
};
