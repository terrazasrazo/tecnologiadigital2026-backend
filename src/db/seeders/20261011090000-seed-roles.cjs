'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      'roles',
      [
        {
          name: 'admin',
          description: 'Administra usuarios, configuración global y estadísticas.',
          created_at: now,
          updated_at: now,
        },
        {
          name: 'organizador',
          description: 'Gestiona ponencias, ponentes y ubicaciones.',
          created_at: now,
          updated_at: now,
        },
        {
          name: 'ponente',
          description: 'Edita su propia información y semblanza.',
          created_at: now,
          updated_at: now,
        },
        {
          name: 'asistente',
          description: 'Se registra, asiste a ponencias y descarga constancias.',
          created_at: now,
          updated_at: now,
        },
      ],
      { ignoreDuplicates: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', {
      name: ['admin', 'organizador', 'ponente', 'asistente'],
    });
  },
};
