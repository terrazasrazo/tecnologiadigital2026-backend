'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      'settings',
      [
        {
          key: 'certificate.metric',
          value: JSON.stringify('talks'),
          description: 'Métrica de elegibilidad de constancia: "talks" o "hours".',
          created_at: now,
          updated_at: now,
        },
        {
          key: 'certificate.minTalks',
          value: JSON.stringify(1),
          description: 'Número mínimo de ponencias asistidas para emitir constancia.',
          created_at: now,
          updated_at: now,
        },
        {
          key: 'certificate.minHours',
          value: JSON.stringify(0),
          description: 'Horas acumuladas mínimas para emitir constancia.',
          created_at: now,
          updated_at: now,
        },
      ],
      { ignoreDuplicates: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('settings', {
      key: ['certificate.metric', 'certificate.minTalks', 'certificate.minHours'],
    });
  },
};
