# HR Role Permission App (React + TypeScript + MVC Style)

Simple frontend starter using your backend APIs for:
- Login
- Microsoft login/register (OAuth)
- Provider-driven SSO login buttons with icons
- JWT handling
- Role-based route protection
- Permission-based action restriction
- Tailwind CSS + shadcn-style UI components

## Project Structure

- `src/models`: Domain models
- `src/views`: UI pages/layouts
- `src/controllers`: App controllers for auth/permissions
- `src/services`: API service + auth context
- `src/components`: Guards (`ProtectedRoute`, `PermissionGate`)

## Configure

1. Copy env file:
   - `cp .env.example .env`
2. Set your backend URL in `.env`.

## API contracts assumed

- `POST /auth/login` -> `{ token, user }`
- `GET /users/me` -> `user`
- `GET /rbac/permissions` -> `string[]`
- `GET /auth/sso/providers` -> enabled providers list
  Example: `[{ key, displayName, loginUrl }]`
- `GET /auth/sso/login-url?provider=microsoft&mode=login|register&redirectUri=...` -> `{ loginUrl }` (or `{ authorizationUrl }`)
- `GET /auth/sso/callback?provider=microsoft&code=...&state=...&redirectUri=...` -> `{ token, user }`

Adjust in `src/services/AuthService.ts` as needed to match your backend.

## Run

- `npm install`
- `npm run dev`

## MVC Mapping in this frontend

- Model: `UserModel`, auth types
- View: React pages/components in `src/views`
- Controller: `AuthController`, `PermissionController`
