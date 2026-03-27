# NivaranSetu Backend

This folder contains a simple Node.js/Express backend with MongoDB (via Mongoose) for the NivaranSetu frontend.

## Features

- Users, officers and admins with role-based access control
- JWT authentication
- Complaints collection with status/history
- Admin endpoints to view users and create officers
- Officers can update complaint status
- Users submit complaints and only view their own
- Login required before accessing any dashboard route

## Getting started

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Copy `.env.example` to `.env` and set `MONGO_URI` & `JWT_SECRET`.
3. Start MongoDB (e.g. `mongod`).
4. Run in development:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

## API endpoints

### Auth
- `POST /api/auth/register` - register with JSON `{name,email,password,role,department?}`
- `POST /api/auth/login` - login with `{email,password}`; returns JWT token, role

### Complaints
- `POST /api/complaints` *(user)* - create new complaint
- `GET /api/complaints` - get complaints based on role (user own, officer assigned, admin all)
- `GET /api/complaints/:id` - get single complaint
- `PUT /api/complaints/:id/status` *(officer/admin)* - change status
- `PUT /api/complaints/:id/assign` *(admin)* - assign officer

### Admin
- `GET /api/admin/users` *(admin)* - list all users
- `POST /api/admin/officers` *(admin)* - create officer account

## Notes

- Frontend should store JWT token and pass it as `Authorization: Bearer <token>` header.
- Protect routes using the `protect` and `authorize` middleware exported from `middleware/auth.js`.
- Session storage on frontend is separate from backend authentication.

This simple backend can be extended with more features, validation, pagination, email notifications, etc.