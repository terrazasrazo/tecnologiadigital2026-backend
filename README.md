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

| Componente     | Tecnología                                      |
| -------------- | ----------------------------------------------- |
| Lenguaje       | JavaScript (ES Modules)                         |
| Runtime        | Node.js 24                                      |
| Framework HTTP | Express 5                                       |
| ORM            | Sequelize + `sequelize-cli`                     |
| Base de datos  | MySQL                                           |
| Autenticación  | JWT (access + refresh) + bcrypt                 |
| Correo         | Nodemailer + plantillas EJS                     |
| PDF            | wkhtmltopdf (por defecto) / Gotenberg (alterno) |
| QR             | Token firmado (HMAC) por ponencia               |
| Validación     | Zod                                             |
| Logs           | Pino                                            |
| Tests          | Vitest + Supertest                              |

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

## Endpoints

### Convenciones

- **URL base**: todas las rutas de la API cuelgan de `/api/*`, salvo `GET /health`.
- **Autenticación**: envía el token de acceso en la cabecera
  `Authorization: Bearer <accessToken>`. Los roles admitidos se indican por endpoint.
- **Cuerpo y respuestas**: `Content-Type: application/json` (salvo la subida de fotografía, que
  usa `multipart/form-data`, y la descarga de constancias, que devuelve `application/pdf`).
- **Paginación**: los listados aceptan `page` (>=1) y `pageSize` (1–100) y responden con
  `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- **Errores**: todas las respuestas de error usan el formato
  `{ "error": { "code": "CODIGO", "message": "Descripción", "details": {} } }`. Los errores de
  validación Zod usan `code: "VALIDATION_ERROR"` (HTTP 400) y su `details` lista los problemas.
- **Acceso**: `Público`, `Auth` (cualquier usuario autenticado), `admin`, `admin/organizador` y
  `dueño` (el propio usuario o un administrador/organizador).

### Salud

| Método | Ruta      | Acceso  |
| ------ | --------- | ------- |
| `GET`  | `/health` | Público |

`GET /health` → `{ "status": "ok", "uptime", "timestamp", "env", "db": "up" \| "down" }`.

### Autenticación (`/api/auth`)

| Método | Ruta                            | Acceso  |
| ------ | ------------------------------- | ------- |
| `POST` | `/api/auth/register`            | Público |
| `POST` | `/api/auth/verify-email`        | Público |
| `POST` | `/api/auth/resend-verification` | Público |
| `POST` | `/api/auth/forgot-password`     | Público |
| `POST` | `/api/auth/reset-password`      | Público |
| `POST` | `/api/auth/login`               | Público |
| `POST` | `/api/auth/refresh`             | Público |
| `POST` | `/api/auth/logout`              | Auth    |

- **`POST /register`** — crea un usuario con rol `asistente` en estado `pending`.
  Body: `name`, `lastName`, `email`, `password` (8–72), `entity?`, `educationLevel?`, `phone?`.
  Respuesta `201`: `{ "user": { "id", "name", "email", "status" } }`. Errores: `EMAIL_IN_USE` (409).
- **`POST /verify-email`** — activa la cuenta. Body: `token`. Respuesta: `{ "success": true }`.
  Errores: `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED` (400).
- **`POST /resend-verification`** — reenvía el correo de verificación. Body: `email`.
  Respuesta: `{ "success": true }`.
- **`POST /forgot-password`** — envía correo de recuperación. Body: `email`.
  Respuesta: `{ "success": true }`.
- **`POST /reset-password`** — define nueva contraseña. Body: `token`, `password`.
  Respuesta: `{ "success": true }`.
- **`POST /login`** — Body: `email`, `password`.
  Respuesta: `{ "user": { ...perfil }, "tokens": { "accessToken", "refreshToken", "tokenType", "expiresIn" } }`.
  Errores: `INVALID_CREDENTIALS` (401), `ACCOUNT_NOT_ACTIVE` (403).
- **`POST /refresh`** — rota el refresh token. Body: `refreshToken`.
  Respuesta: igual que `/login`. Errores: `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_EXPIRED`,
  `REFRESH_TOKEN_REUSED` (401).
- **`POST /logout`** — revoca el refresh token. Body: `refreshToken?`.
  Respuesta: `{ "success": true }`.

### Usuarios (`/api/users`)

| Método   | Ruta                            | Acceso |
| -------- | ------------------------------- | ------ |
| `GET`    | `/api/users/me`                 | Auth   |
| `PATCH`  | `/api/users/me`                 | Auth   |
| `POST`   | `/api/users/me/change-password` | Auth   |
| `GET`    | `/api/users`                    | admin  |
| `POST`   | `/api/users`                    | admin  |
| `GET`    | `/api/users/:id`                | admin  |
| `PATCH`  | `/api/users/:id`                | admin  |
| `PATCH`  | `/api/users/:id/status`         | admin  |
| `DELETE` | `/api/users/:id`                | admin  |

El objeto de usuario devuelto (`toPublicJSON`) es:
`{ "id", "name", "lastName", "email", "entity", "educationLevel", "phone", "status", "emailVerifiedAt", "role": { "id", "name" } }`.

- **`GET /me`** → perfil del usuario autenticado.
- **`PATCH /me`** — Body: `name?`, `lastName?`, `entity?|null`, `educationLevel?|null`, `phone?|null`
  (al menos un campo). → perfil actualizado.
- **`POST /me/change-password`** — Body: `currentPassword`, `newPassword` (8–72).
  → `{ "success": true }`. Error: `INVALID_CURRENT_PASSWORD` (400).
- **`GET /`** — Query: `page`, `pageSize`, `role?` (`admin|organizador|ponente|asistente`),
  `status?` (`pending|active|inactive`), `search?`. → listado paginado.
- **`POST /`** — Body: `name`, `lastName`, `email`, `password`, `role`, `status?`,
  `entity?`, `educationLevel?`, `phone?`. → usuario `201`. Errores: `EMAIL_IN_USE` (409), `INVALID_ROLE` (400).
- **`GET /:id`** → usuario. Error: `USER_NOT_FOUND` (404).
- **`PATCH /:id`** — Body: `name?`, `lastName?`, `email?`, `role?`, `status?`, `entity?|null`,
  `educationLevel?|null`, `phone?|null`. → usuario actualizado.
- **`PATCH /:id/status`** — Body: `status`. → usuario actualizado (al desactivar revoca sesiones).
- **`DELETE /:id`** → `{ "success": true }`. Error: `CANNOT_DELETE_SELF` (400).

### Ponentes (`/api/speakers`)

| Método   | Ruta                      | Acceso                           |
| -------- | ------------------------- | -------------------------------- |
| `GET`    | `/api/speakers`           | Público                          |
| `GET`    | `/api/speakers/:id`       | Público                          |
| `POST`   | `/api/speakers`           | admin/organizador                |
| `PATCH`  | `/api/speakers/:id`       | Auth (dueño o admin/organizador) |
| `DELETE` | `/api/speakers/:id/photo` | Auth (dueño o admin/organizador) |
| `DELETE` | `/api/speakers/:id`       | admin/organizador                |

Objeto de ponente: `{ "id", "userId", "name", "academicDegree", "institution", "bio", "photoUrl", "createdAt", "updatedAt" }`.

- **`GET /`** — Query: `page`, `pageSize`, `search?`. → listado paginado.
- **`GET /:id`** → ponente. Error: `SPEAKER_NOT_FOUND` (404).
- **`POST /`** — `multipart/form-data`. Campos: `name`, `academicDegree?`, `institution?`, `bio?`,
  `userId?` y archivo `photo?`. → ponente `201`.
  Errores: `SPEAKER_ALREADY_LINKED` (409), `USER_NOT_FOUND` (400).
- **`PATCH /:id`** — `multipart/form-data`. Campos: `name?`, `academicDegree?`, `institution?`,
  `bio?` y archivo `photo?`. → ponente actualizado. Error: `FORBIDDEN` (403).
- **`DELETE /:id/photo`** → ponente sin fotografía.
- **`DELETE /:id`** → `{ "success": true }`.

### Ubicaciones (`/api/locations`)

| Método   | Ruta                 | Acceso            |
| -------- | -------------------- | ----------------- |
| `GET`    | `/api/locations`     | Público           |
| `GET`    | `/api/locations/:id` | Público           |
| `POST`   | `/api/locations`     | admin/organizador |
| `PATCH`  | `/api/locations/:id` | admin/organizador |
| `DELETE` | `/api/locations/:id` | admin/organizador |

Objeto de ubicación: `{ "id", "name", "building", "capacity", "address", "createdAt", "updatedAt" }`.

- **`GET /`** — Query: `page`, `pageSize`, `search?`. → listado paginado.
- **`GET /:id`** → ubicación. Error: `LOCATION_NOT_FOUND` (404).
- **`POST /`** — Body: `name`, `building?`, `capacity?`, `address?`. → ubicación `201`.
- **`PATCH /:id`** — Body: `name?`, `building?`, `capacity?`, `address?`. → ubicación actualizada.
- **`DELETE /:id`** → `{ "success": true }`. Error: `LOCATION_IN_USE` (409) si tiene ponencias.

### Ponencias (`/api/talks`)

| Método   | Ruta             | Acceso            |
| -------- | ---------------- | ----------------- |
| `GET`    | `/api/talks`     | Público           |
| `GET`    | `/api/talks/:id` | Público           |
| `POST`   | `/api/talks`     | admin/organizador |
| `PATCH`  | `/api/talks/:id` | admin/organizador |
| `DELETE` | `/api/talks/:id` | admin/organizador |

Objeto de ponencia: `{ "id", "title", "description", "date", "startTime", "endTime", "durationMinutes", "status", "location": {...}|null, "speakers": [...], "attendanceWindow": { "opensAt", "closesAt", "isOpen" }, "createdAt", "updatedAt" }`.

- **`GET /`** — Query: `page`, `pageSize`, `search?`, `date?` (AAAA-MM-DD), `locationId?`,
  `status?` (`scheduled|cancelled`). → listado paginado.
- **`GET /:id`** → ponencia. Error: `TALK_NOT_FOUND` (404).
- **`POST /`** — Body: `title`, `description?`, `date`, `startTime` (HH:mm), `endTime` (HH:mm),
  `locationId?`, `status?`, `speakerIds?` (array de ids), `attendanceOpensAt?`, `attendanceClosesAt?`.
  → ponencia `201` (la ventana de asistencia se calcula automáticamente si no se especifica).
  Errores: `LOCATION_NOT_FOUND` (400), `SPEAKER_NOT_FOUND` (400), `TALK_TIME_CONFLICT` (409).
- **`PATCH /:id`** — Body: los mismos campos que en la creación (todos opcionales).
  → ponencia actualizada. Errores: `INVALID_TIME_RANGE` (400), `TALK_TIME_CONFLICT` (409).
- **`DELETE /:id`** → `{ "success": true }`.

### Asistencia (`/api/attendance`)

| Método   | Ruta                                          | Acceso            |
| -------- | --------------------------------------------- | ----------------- |
| `GET`    | `/api/attendance/me`                          | Auth              |
| `POST`   | `/api/attendance/talks/:talkId/register`      | Auth              |
| `DELETE` | `/api/attendance/talks/:talkId/register`      | Auth              |
| `GET`    | `/api/attendance/talks/:talkId/registrations` | admin/organizador |
| `GET`    | `/api/attendance/talks/:talkId/qr`            | admin/organizador |
| `POST`   | `/api/attendance/talks/:talkId/checkin`       | Auth              |
| `POST`   | `/api/attendance/talks/:talkId/attendance`    | admin/organizador |

Objeto de inscripción: `{ "id", "talkId", "userId", "status": "registered|attended|cancelled", "registeredAt", "attendedAt", "talk?": {...}, "user?": {...} }`.

- **`GET /me`** → `{ "data": [ inscripciones del usuario ] }` (excluye canceladas).
- **`POST /talks/:talkId/register`** → inscripción `201`. Errores: `TALK_CANCELLED` (409),
  `REGISTRATION_CLOSED` (409), `ALREADY_REGISTERED` (409).
- **`DELETE /talks/:talkId/register`** → `{ "success": true }`. Errores: `REGISTRATION_NOT_FOUND` (404),
  `CANNOT_CANCEL_ATTENDED` (409).
- **`GET /talks/:talkId/registrations`** — Query: `page`, `pageSize`, `status?`. → listado paginado con el usuario.
- **`GET /talks/:talkId/qr`** → `{ "talkId", "token", "opensAt", "closesAt" }` (token firmado para el QR).
- **`POST /talks/:talkId/checkin`** — Body: `token` (contenido del QR).
  → `{ "alreadyAttended": bool, "registration": {...} }`.
  Errores: `INVALID_QR` (400), `ATTENDANCE_NOT_OPEN` (409), `ATTENDANCE_CLOSED` (409), `TALK_CANCELLED` (409).
- **`POST /talks/:talkId/attendance`** — Body: `userId`, `attended?` (default `true`).
  → inscripción actualizada. Error: `USER_NOT_FOUND` (404).

### Constancias (`/api/certificates`)

| Método | Ruta                              | Acceso                           |
| ------ | --------------------------------- | -------------------------------- |
| `GET`  | `/api/certificates/eligibility`   | Auth                             |
| `GET`  | `/api/certificates/me`            | Auth                             |
| `POST` | `/api/certificates`               | Auth                             |
| `GET`  | `/api/certificates`               | admin/organizador                |
| `POST` | `/api/certificates/users/:userId` | admin/organizador                |
| `GET`  | `/api/certificates/:id/download`  | Auth (dueño o admin/organizador) |
| `GET`  | `/api/certificates/verify/:code`  | Público                          |

Objeto de constancia: `{ "id", "userId", "code", "issuedAt", "talksCount", "hoursTotal", "threshold", "downloadUrl", "user?": {...} }`.

- **`GET /eligibility`** → `{ "eligible", "metric": "talks|hours|both", "talksCount", "hoursTotal", "minutesTotal", "threshold": { "minTalks", "minHours" }, "talks": [...] }`.
- **`GET /me`** → constancia del usuario. Error: `CERTIFICATE_NOT_FOUND` (404).
- **`POST /`** — Body: `sendEmail?` (default `true`). Genera (o regenera) el PDF y envía el correo con
  adjunto. → constancia `201`. Error: `NOT_ELIGIBLE` (409).
- **`GET /`** — Query: `page`, `pageSize`, `search?` (nombre/apellido/correo). → listado paginado con el usuario.
- **`POST /users/:userId`** — Body: `sendEmail?`. Emite la constancia a nombre de otro usuario (admin/organizador).
  → constancia `201`. Error: `NOT_ELIGIBLE` (409), `USER_NOT_FOUND` (404).
- **`GET /:id/download`** → archivo `application/pdf`. Errores: `CERTIFICATE_NOT_FOUND` (404),
  `CERTIFICATE_FILE_MISSING` (404), `FORBIDDEN` (403).
- **`GET /verify/:code`** → verificación pública: `{ "valid": true, "code", "holder", "talksCount", "hoursTotal", "issuedAt" }`.
  Error: `CERTIFICATE_NOT_FOUND` (404).

### Códigos de error

| HTTP        | Códigos                                                                                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400         | `VALIDATION_ERROR`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`, `INVALID_ROLE`, `INVALID_TIME_RANGE`, `INVALID_CURRENT_PASSWORD`, `INVALID_QR`, `USER_NOT_FOUND`, `LOCATION_NOT_FOUND`, `SPEAKER_NOT_FOUND`, `CANNOT_DELETE_SELF` |
| 401         | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REUSED`                                                                                                                               |
| 403         | `FORBIDDEN`, `ACCOUNT_NOT_ACTIVE`                                                                                                                                                                                                             |
| 404         | `NOT_FOUND`, `USER_NOT_FOUND`, `SPEAKER_NOT_FOUND`, `LOCATION_NOT_FOUND`, `TALK_NOT_FOUND`, `REGISTRATION_NOT_FOUND`, `CERTIFICATE_NOT_FOUND`, `CERTIFICATE_FILE_MISSING`                                                                     |
| 409         | `EMAIL_IN_USE`, `SPEAKER_ALREADY_LINKED`, `LOCATION_IN_USE`, `TALK_TIME_CONFLICT`, `TALK_CANCELLED`, `REGISTRATION_CLOSED`, `ALREADY_REGISTERED`, `CANNOT_CANCEL_ATTENDED`, `ATTENDANCE_NOT_OPEN`, `ATTENDANCE_CLOSED`, `NOT_ELIGIBLE`        |
| 500/502/504 | `INTERNAL_ERROR`, `MAIL_SEND_FAILED`, `PDF_RENDER_FAILED`, `PDF_PROVIDER_UNAVAILABLE`, `PDF_PROVIDER_UNSUPPORTED`, `PDF_TIMEOUT`                                                                                                              |

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
