## Quick context for AI coding agents

This backend is an Express + Mongoose API server organized as feature modules under `src/modules/*`.
Follow the examples in each module (controller, service, model, routes, validator, mapper) when adding or modifying behavior.

Key entrypoints
- Server: `src/server.js` — starts server, connects to MongoDB, and runs a tiny email worker loop.
- App: `src/app.js` — Express app setup (helmet, cors, cookieParser, morgan, rate limiting, swagger).
- Routes registry: `src/routes/index.js` — mounts all feature modules at `/api/v1/*`.

Important runtime behaviors you must preserve
- Stripe webhook requires raw body: `app.use('/api/v1/payments/webhook/stripe', express.raw(...))` — keep this route registration before `express.json()` if you add body-parsing middleware.
- Global rate limiter configured in `src/app.js` (15 min window, max 300) is applied at `/api/v1`.
- Swagger UI served at `/api-docs` using `src/docs/swagger`.
- Email worker: `setInterval` in `src/server.js` calls `EmailService.processOneJob()` every 10s — avoid blocking operations during startup/shutdown.

Configuration & environment
- Primary scripts (see `backend/package.json`):
  - `npm run dev` → `nodemon src/server.js`
  - `npm start` → `node src/server.js`
  - `npm run seed` → `node src/scripts/seed.js`
  - `npm test` → runs `jest`
- CORS: `CORS_ORIGINS` is a comma-separated list; parsed in `src/app.js`.
- JWT: secrets and options read from env; see `src/utils/constants.util.js` for `getAccessSecret`, `getRefreshSecret`, and `baseSignOptions()` / `baseVerifyOptions()` — ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` exist in env when running auth flows.
- Mongo: connection handled in `src/config/db.js` (used by `src/server.js`).

Common code patterns & conventions
- Module layout: each feature under `src/modules/<name>/` typically contains:
  - `<name>.model.js` (mongoose schema)
  - `<name>.service.js` (business logic & DB access)
  - `<name>.controller.js` (request/response handling)
  - `<name>.routes.js` (express Router)
  - `<name>.validator.js` (input validation)
  - `<name>.mapper.js` (DTO mapping)
- Middlewares live in `src/middlewares/`:
  - `auth.middleware.js` — JWT-based auth
  - `authorize.middleware.js` — role/permission checks
  - `validate.middleware.js` / `validator.middleware.js` — request validation wiring
  - `errorHandler.middleware.js` — centralized error responses
- Errors: project uses `AppError` (`src/utils/appError.util.js`). Throw that to propagate HTTP errors; the `errorHandler` middleware formats responses.
- Validation: `zod` is used in validators; keep validators small and return consistent error shapes consumed by `validator.middleware.js`.

Testing & local development
- Run `npm run dev` for local iteration. The server logs location and swagger URL on startup.
- Tests: `npm test` (Jest). Look for unit tests near modules (if present). If adding tests, follow current file layout and require minimal DB mocking.

Integration & external dependencies
- Stripe webhook: keep raw body and signature verification order intact.
- Email: nodemailer & a background job in `EmailService` (see `src/modules/emails/email.service.js`). Be careful when changing worker frequency or startup order.
- Swagger: API docs generated via `src/docs/swagger.js` and exposed at `/api-docs`.

Examples to copy from
- Adding a route: copy pattern from `src/modules/announcements/announcement.routes.js` and register it in `src/routes/index.js`.
- JWT usage: see `src/utils/constants.util.js` and `src/middlewares/auth.middleware.js` for signing/verifying tokens.

What NOT to change accidentally
- Order of middleware in `src/app.js` (especially the Stripe raw body registration and `express.json()` placement).
- The `setInterval` email worker in `src/server.js` — avoid duplicating or blocking it during tests.
- The global `/api/v1` rate limiter unless intentionally changing traffic limits.

If you need clarification or want me to expand any section (examples for creating a new module, test harness, or env matrix), tell me which area and I will update this file.
