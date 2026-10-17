'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      'settings',
      [
        {
          key: 'attendance.opensBeforeEndMinutes',
          value: '20',
          description:
            'Minutos antes del término de la ponencia en que se habilita el registro de asistencia',
          created_at: now,
          updated_at: now,
        },
        {
          key: 'attendance.closesAfterEndMinutes',
          value: '10',
          description:
            'Minutos después del término de la ponencia en que se cierra el registro de asistencia',
          created_at: now,
          updated_at: now,
        },
      ],
      { ignoreDuplicates: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('settings', {
      key: ['attendance.opensBeforeEndMinutes', 'attendance.closesAfterEndMinutes'],
    });
  },
};
