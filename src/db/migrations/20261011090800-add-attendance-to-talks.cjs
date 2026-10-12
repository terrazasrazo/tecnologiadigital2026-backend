'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('talks', 'attendance_opens_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'status',
    });
    await queryInterface.addColumn('talks', 'attendance_closes_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'attendance_opens_at',
    });
    await queryInterface.addColumn('talks', 'qr_secret', {
      type: Sequelize.STRING(64),
      allowNull: true,
      after: 'attendance_closes_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('talks', 'qr_secret');
    await queryInterface.removeColumn('talks', 'attendance_closes_at');
    await queryInterface.removeColumn('talks', 'attendance_opens_at');
  },
};
