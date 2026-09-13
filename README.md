# Student Portfolio Task Manager

Practical 6 full-stack integration: React + Vite frontend, Express/Mongoose backend, and MongoDB persistence.

## Architecture

```text
React (127.0.0.1:5173) -> Express API (127.0.0.1:5000) -> MongoDB (127.0.0.1:27017/taskmanager)
```

## Prerequisites

- Node.js 18 or newer
- MongoDB running locally as the `MongoDB` Windows service

## Run the application

Use three PowerShell terminals.

### 1. Start MongoDB

Run PowerShell as Administrator:

```powershell
Start-Service MongoDB
Get-Service MongoDB
```

The service status must be `Running`.

### 2. Start the backend

```powershell
cd D:\nodejs\student-portfolio\task-manager-api
npm install
npm start
```

Before starting the backend, create `task-manager-api/.env` from `.env.example` and set a private `JWT_SECRET`. The file is ignored by Git.

Expected output:

```text
Server running on port 5000
Connected to MongoDB
```

### 3. Start the frontend

```powershell
cd D:\nodejs\student-portfolio
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/login` and register an account. After login, open the protected task workspace at `http://127.0.0.1:5173/tasks`.

## Full-stack verification

The Task Manager calls the shared functions in `src/api.js` and sends the stored JWT as `Authorization: Bearer <token>`:

- `POST /auth/register` hashes the password with bcrypt and returns a one-hour JWT.
- `POST /auth/login` verifies the password and returns a one-hour JWT.
- `GET /me` returns the currently authenticated user.
- All `/tasks` routes return `401 Unauthorized` without a valid token.
- A `401` response clears the frontend token and redirects the user to login.

Task operations:

- `GET /tasks` loads data on page mount.
- `POST /tasks` creates a task and replaces its optimistic UI item with the MongoDB response.
- `PUT /tasks/:id` updates completion or title and refreshes the matching local item.
- `DELETE /tasks/:id` requires confirmation and removes the item after the server succeeds.

Every operation displays loading/disabled state and a success or error message. Refreshing the browser calls `GET /tasks` again, proving that tasks persist in MongoDB.

## API checks

Register a user:

```powershell
$body = @{ email = 'student@example.com'; password = 'Password123!' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:5000/auth/register' -Method Post -Body $body -ContentType 'application/json'
```

After login, copy the returned token and use it for protected requests:

```powershell
$headers = @{ Authorization = 'Bearer <token>' }
Invoke-RestMethod -Uri 'http://127.0.0.1:5000/tasks' -Headers $headers
```

## Error handling

- CORS is enabled before the routes so Vite can call Express locally.
- The backend validates content type and task IDs.
- Mongoose validation and cast errors return structured JSON.
- The frontend handles loading and errors for initial load and every write operation.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
