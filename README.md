# API REST de Eventos — Ponencias, Asistentes y Constancias

API REST que da soporte al ciclo completo de un evento académico: alta y administración de
usuarios, registro de ponencias y ponentes, control de asistencia mediante QR con ventana de
tiempo por ponencia, generación y envío de constancias en PDF, y estadísticas de usuarios y
asistencia. Será consumida por un Frontend en Astro alojado en otro servidor.

## Características

- **Gestión de usuarios**: registro por el propio usuario, validación de correo mediante
  enlace de confirmación, recuperación de contraseña por correo, edición de información y
  estadísticas (número de usuarios, activos, entidad, nivel educativo y asistencia a
  ponencias).
- **Ponencias**: registro y edición (título, descripción, fecha, hora de inicio, hora de
  término, ponentes y ubicación), gestión de ubicaciones y control de asistencia por QR con
  ventana de tiempo configurable por ponencia.
- **Ponentes**: registro y edición de información (nombre, grado académico, institución,
  semblanza y fotografía).
- **Constancias**: generación en PDF a partir de una plantilla HTML (anverso con el total de
  horas y reverso con las ponencias asistidas), notificación por correo al asistente,
  contabilización de ponencias y horas, y detalle imprimible de cada ponencia.
- **Estadísticas**: de usuarios y de asistencia a ponencias.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Lenguaje | JavaScript (ES Modules) |
| Runtime | Node.js 24 |
| Framework HTTP | Express 5 |
| ORM | Sequelize + `sequelize-cli` |
| Base de datos | MySQL |
| Autenticación | JWT (access + refresh) + bcrypt |
| Correo | Nodemailer + plantillas EJS |
| PDF | wkhtmltopdf (por defecto) / Gotenberg (alterno) |
| QR | Token firmado (HMAC) por ponencia |
| Validación | Zod |
| Logs | Pino |
| Tests | Vitest + Supertest |

## Roles

- `admin`: administración total, usuarios, configuración (umbral de constancias) y estadísticas.
- `organizador`: gestión de ponencias, ponentes y ubicaciones.
- `ponente`: edición de su propia información y semblanza.
- `asistente`: registro, asistencia a ponencias y descarga de constancias.

## Requisitos

- Node.js 24 y npm 11 (o superior).
- Un servidor **MySQL**.
- Un servidor **SMTP** para el envío de correos.
- **wkhtmltopdf** instalado en la máquina (desarrollo y producción) para la generación de PDF.

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Ejecutar migraciones y seeders
npm run db:migrate
npm run db:seed

# 4. Levantar en desarrollo
npm run dev
```

Verifica que el servicio responde en el endpoint de salud: `GET /health`.

## Estructura del proyecto

```
src/
├─ config/       # variables de entorno y conexión a la base de datos
├─ db/           # modelos, migraciones y seeders de Sequelize
├─ modules/      # dominios: auth, users, speakers, talks, locations,
│                #          attendance, certificates, statistics
├─ middlewares/  # auth, rbac, validate, error, rateLimit, upload
├─ services/     # mailer, pdf, qr, storage, certificateBuilder
├─ emails/       # plantillas EJS
├─ utils/
└─ routes/
```

## Documentación

El plan de acción completo, el modelo de datos y los milestones están en
[`PLAN.md`](./PLAN.md).

## Licencia

Este proyecto se distribuye bajo la licencia **GNU General Public License v3.0**. Consulta el
archivo [`LICENSE`](./LICENSE).
