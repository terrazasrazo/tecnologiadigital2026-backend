import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Aísla los tests de la configuración de despliegue (BASE_PATH, CORS, …).
    setupFiles: ['./tests/setup.js'],
  },
});
