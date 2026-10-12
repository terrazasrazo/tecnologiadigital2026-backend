'use strict';

const bcrypt = require('bcrypt');

const DEV_ADMIN = {
  name: 'Administrador',
  last_name: 'de Desarrollo',
  email: 'admin@tecnologiadigital.dev',
  password: 'Admin123!',
};

/**
 * Seeder SOLO para desarrollo: crea un usuario admin inicial para poder probar
 * el login. No debe ejecutarse en producción con esta contraseña.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { replacements: { email: DEV_ADMIN.email } },
    );
    if (existing.length > 0) {
      return;
    }

    const [adminRole] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'admin' LIMIT 1",
    );
    if (adminRole.length === 0) {
      throw new Error('No existe el rol "admin". Ejecuta primero el seeder de roles.');
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(DEV_ADMIN.password, 10);

    await queryInterface.bulkInsert('users', [
      {
        name: DEV_ADMIN.name,
        last_name: DEV_ADMIN.last_name,
        email: DEV_ADMIN.email,
        password_hash: passwordHash,
        role_id: adminRole[0].id,
        status: 'active',
        email_verified_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: DEV_ADMIN.email });
  },
};
