'use strict';

const bcrypt = require('bcrypt');
const { QueryTypes } = require('sequelize');

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const DEV_ADMIN = {
  name: 'Administrador',
  last_name: 'de Desarrollo',
  email: 'admin@tecnologiadigital.dev',
  password: 'Admin123!',
};

/**
 * Crea un usuario admin inicial para poder entrar al panel.
 *
 * En desarrollo usa credenciales por defecto; en producción conviene definir
 * SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (y opcionalmente SEED_ADMIN_NAME /
 * SEED_ADMIN_LAST_NAME) en lugar de las credenciales de desarrollo.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const admin = {
      name: process.env.SEED_ADMIN_NAME || DEV_ADMIN.name,
      last_name: process.env.SEED_ADMIN_LAST_NAME || DEV_ADMIN.last_name,
      email: process.env.SEED_ADMIN_EMAIL || DEV_ADMIN.email,
      password: process.env.SEED_ADMIN_PASSWORD || DEV_ADMIN.password,
    };

    // Nota: se pasa `type: QueryTypes.SELECT` explícitamente porque, sin él,
    // Sequelize ejecuta la consulta como "raw" y el dialecto de MariaDB falla
    // con "Cannot delete property 'meta' of [object Array]".
    const existing = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { replacements: { email: admin.email }, type: QueryTypes.SELECT },
    );
    if (existing.length > 0) {
      return;
    }

    const adminRole = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'admin' LIMIT 1",
      { type: QueryTypes.SELECT },
    );
    if (adminRole.length === 0) {
      throw new Error('No existe el rol "admin". Ejecuta primero el seeder de roles.');
    }

    if (isProduction && !(process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[seed-dev-admin] Creando admin con las credenciales de desarrollo en un entorno ' +
          'de producción. Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD con valores seguros.',
      );
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(admin.password, 10);

    await queryInterface.bulkInsert('users', [
      {
        name: admin.name,
        last_name: admin.last_name,
        email: admin.email,
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
    await queryInterface.bulkDelete('users', {
      email: process.env.SEED_ADMIN_EMAIL || DEV_ADMIN.email,
    });
  },
};
