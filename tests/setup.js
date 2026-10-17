// Los tests siempre apuntan a la raíz del servicio y usan UTC, sin importar la
// configuración de despliegue (BASE_PATH, EVENT_TZ_OFFSET_MINUTES, …). Se
// ejecuta antes de importar la app.
process.env.BASE_PATH = '';
process.env.EVENT_TZ_OFFSET_MINUTES = '0';
