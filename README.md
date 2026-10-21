# Student Portfolio Task Manager

Practical 6 full-stack integration: React + Vite frontend, Express/Mongoose backend, and MongoDB persistence.

## Architecture

```text
React (127.0.0.1:5173) -> Express API (127.0.0.1:5000) -> MongoDB (127.0.0.1:27017/taskmanager)
```

## Practical 8: Performance Optimization

The `/project`, `/contact`, and `/tasks` routes use `React.lazy()` and are
rendered inside `Suspense` with a `Loading page...` fallback. Their JavaScript
is downloaded when the route is visited instead of being included in the
initial app chunk.

### Build comparison

Measured with `npm run build` using Vite production output:

| Metric | Before lazy loading | After lazy loading |
| --- | ---: | ---: |
| Initial JavaScript | 243.82 kB | 237.55 kB |
| Initial JavaScript gzip | 77.89 kB | 76.27 kB |
| Initial CSS | 6.00 kB | 2.82 kB |
| Route chunks | 0 | Projects: 2.63 kB, Contact: 0.69 kB |
| Route chunks gzip | 0 | Projects: 1.11 kB, Contact: 0.41 kB |

The authenticated task route is also split into `TaskManager-BRgVdPYj.js`
(`3.84 kB`, `1.37 kB` gzip) with its `TaskManager-B4b45i9v.css` stylesheet
(`3.17 kB`, `1.17 kB` gzip). The route chunk values above cover the two
required portfolio routes; the task chunk is the supplementary optimization.

The initial request is smaller after optimization, while the total eventual
download remains approximately the same because the route code is deferred,
not removed. This improves perceived startup performance because the home page
can become interactive before unused route code is downloaded.

### Browser verification

1. Run `npm run dev` and open the app with browser DevTools Network tab open.
2. Reload `/` with the cache disabled and record the initial JavaScript request.
3. Visit `/project` and `/contact`; verify that a separate `Projects-*.js` or
   `Contact-*.js` request appears only when that route is opened.
4. Throttle the Network tab to Slow 3G and revisit a route to observe the
   `Loading page...` fallback while its chunk downloads.

### Key findings

- The initial bundle is downloaded during startup; a lazy chunk is requested
  only when its route is rendered.
- Lazy loading improves perceived performance by prioritizing code needed for
  the first screen, even though a user who visits every route eventually
  downloads nearly the same total application code.
- For a very small app, the extra chunks and loading states may add more
  complexity than the startup savings justify.

## Practical 9: In-Memory Caching and Query Optimization

The backend uses `node-cache` for `GET /tasks` (`all_tasks`) and
`GET /tasks/:id` (`task:<id>`), with a 60-second default TTL. Set
`TASK_CACHE_TTL_SECONDS` to experiment with another positive TTL. Successful
task creation clears the list key; successful updates and deletions clear the
list key and affected task key. Cache hit/miss totals and current cache state
are available at authenticated `GET /debug/cache`.

Caching is enabled by default. Set `TASK_CACHE_ENABLED=false` in the backend
environment to collect an uncached baseline without changing source code.
Restart the backend between conditions to reset the in-memory counters and
keys. Use the same account, task dataset, client, and network for both runs.
For the cached condition, send one warm-up request, then record the next three
`GET /tasks` response times. For the uncached condition, restart with caching
disabled and record three `GET /tasks` response times. Include units from the
client's Time field; do not compare the first cold-cache request as a hit.

| Condition | Sample 1 (ms) | Sample 2 (ms) | Sample 3 (ms) | Average (ms) |
| --- | ---: | ---: | ---: | ---: |
| Uncached | 43.11 | 14.75 | 23.25 | 27.04 |
| Cached (after warm-up) | 10.50 | 7.37 | 22.20 | 13.36 |

These measurements were captured against localhost with Node's fetch API using
the same MongoDB database and data: an uncached API instance on port 5001 and a
cache-enabled instance on port 5000. One cold cached request took 171.22 ms and
was excluded from the warmed-cache average. The enabled instance reported 3
hits, 1 miss, and a 60-second TTL. This is a small local sample, not a
performance guarantee; MongoDB, data size, and machine load change results.
Repeat with Postman or Thunder Client on your own machine and replace the table
if you need the lab-client readings. `/debug/cache` returns `hits`, `misses`,
`enabled`, `keys`, and `ttlSeconds` to confirm which condition is running.

Cache invalidation is necessary because otherwise a successful write could
leave the old list or task value available until TTL expiry, so subsequent
reads would return stale data. A 60-second TTL is a reasonable lab default for
short-lived task lists; longer TTLs can improve hit rates but increase the
maximum staleness window if a write bypasses invalidation. `node-cache` stores
values in one Node.js process only. Multiple server instances have separate
caches, so a write received by one instance would not invalidate another
instance's cache; distributed deployments need shared caching or coordinated
invalidation (for example Redis).

## Practical 10: Asynchronous Processing with EventEmitter

The backend uses Node.js's built-in `EventEmitter` from `events.js`; the
separate `listeners.js` module is loaded once when the server starts. After a
task is saved and the cache is invalidated, `POST /tasks` sends its `201`
response, logs the response timestamp, and emits `task-created` with the task
title, creation timestamp, and authenticated user's email (or ID). Its
listener schedules the notification log 2 seconds later. A successful delete
also emits `task-deleted`, which has a separate listener. Errors from the
delayed create listener are emitted as `error` and logged by a registered
error listener.

Expected terminal evidence after creating a task:

```text
[API] POST /tasks response sent at <timestamp>
[Notification] task-created handled at <timestamp about 2 seconds later> | title: "..." | created at: ... | assigned user: ...
```

Local verification with Node fetch returned `201 Created` in 187.25 ms. The
API response log was at `2026-10-08T07:46:10.720Z`, and the delayed handler
logged at `2026-10-08T07:46:12.724Z` (2.004 seconds later). These are sample
localhost readings; your Postman response time will vary.

`emit()` itself invokes registered listener callbacks synchronously; here the
callback schedules the notification using `setTimeout` and returns without
waiting for its delayed work. Thus the route can finish its response while
the notification is pending. CPU-heavy synchronous work inside a listener
would still block Node's event loop. An in-process EventEmitter is suitable
for this small lab, but it is not a durable queue: events can be lost on
process restart, and it does not distribute work across server instances.
High-volume production systems generally use a persistent broker/queue.

### Practical 10 screenshot evidence

1. Capture the API terminal showing the `POST /tasks response sent` line
  followed by the delayed `task-created handled` line and timestamps.
2. Capture Postman showing authenticated `POST http://127.0.0.1:5000/tasks`,
  the `201 Created` response, and response time.
3. Capture a successful `DELETE /tasks/:id` response and the distinct
  `task-deleted` terminal notification.
4. Capture `task-manager-api/events.js` and `listeners.js` to show the native
  emitter and separate listeners.

Do not include the Bearer token or account password in screenshots.

## Prerequisites

- Node.js 20.19+ or 22.12+ for local frontend development
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

## Practical 11: Docker and Docker Compose (CO5 / PO3, PO5)

Objective: Containerize the full-stack Task Management application using Docker and orchestrate services using Docker Compose.

### Architecture

```text
docker-compose.yml
├── frontend (React + Vite served via Nginx multi-stage build, host:5173 -> container:80)
├── backend (Node.js/Express, host:5000 -> container:5000)
└── mongodb (Official MongoDB image, host:27017 -> container:27017, volume: mongodb_data)
Network: app-network (bridge)
Communication: frontend (browser) ──► backend ──► mongodb:27017
All 3 services start together via: docker compose up --build
```

### Run the full stack

1. Start Docker Desktop on your system.
2. In the repository root, run:

```powershell
docker compose up --build
# or using legacy docker-compose syntax:
docker-compose up --build
```

3. Open `http://localhost:5173` in your browser. Register or log in to use the task manager.
4. Verify backend API is reachable at `http://localhost:5000/tasks`.
5. Compose waits for MongoDB's health check before starting the backend. The frontend image is built in two stages: Node builds the Vite app, and the final image serves only the static build with Nginx. Nginx falls back to `index.html` for client-side routes such as `/tasks`.
6. To stop the containers, press `Ctrl+C` or run:

```powershell
docker compose down
```

7. Task data is kept in the named `mongodb_data` volume across container restarts. To intentionally delete that data as well, run:

```powershell
docker compose down --volumes
```

### Verification Commands

- **Check running containers:**
  ```powershell
  docker ps
  ```
- **Inspect container logs:**
  ```powershell
  docker compose logs -f
  ```
- **Inspect created volumes:**
  ```powershell
  docker volume ls
  ```
- **Inspect bridge network:**
  ```powershell
  docker network inspect student-portfolio_app-network
  ```

### Key Analysis & Viva Answers

1. **Why does the backend container need to reference the MongoDB container by its service name (`mongodb`) rather than `localhost`?**
   - Each container runs in its own isolated network namespace with its own loopback address `localhost` (`127.0.0.1`). If backend tried to connect to `localhost:27017`, it would search inside its own container where no MongoDB process is listening.
   - On the Docker bridge network (`app-network`), Docker provides an automatic embedded DNS server that resolves Compose service names (e.g., `mongodb`) to the respective container's internal IP address.
2. **What is the difference between `EXPOSE` in a Dockerfile and the `ports` mapping in `docker-compose.yml`?**
   - `EXPOSE`: Documents the port intended for communication. It acts as metadata and allows inter-container communication on shared networks, but does NOT publish the port to the host machine.
   - `ports`: Binds and publishes a host port to the container port (e.g., `"5173:80"` maps host port 5173 to container port 80), making the service accessible from the outside host machine / browser.
3. **Why is it considered bad practice to copy `node_modules` into a Docker image instead of running `npm install` inside the container?**
   - Local `node_modules` may contain host-specific compiled binaries (e.g. Windows x64 vs Linux Alpine).
   - Copying thousands of files bloats image size and slows down build context transfer time.
   - Using `.dockerignore` to exclude `node_modules` and letting `npm install` run inside the container ensures clean, platform-compatible, deterministic dependencies.

### Practical 11 Screenshot Evidence (Lab Submission)

Capture the following 6 screenshots for your lab record:

1. **Screenshot 1: Docker Version Check**
   - Terminal showing `docker --version` and `docker compose version` (or `docker-compose version`).
2. **Screenshot 2: Build & Start Stack**
   - Terminal showing execution of `docker compose up --build` with all 3 containers building, healthy, and starting.
3. **Screenshot 3: Running Containers (`docker ps`)**
   - Terminal showing `docker ps` with all 3 containers (`frontend`, `backend`, `mongodb`) showing status `Up` / `healthy` and proper port mappings (`5173:80`, `5000:5000`, `27017:27017`).
4. **Screenshot 4: Running Frontend in Browser**
   - Web browser open at `http://localhost:5173` showing the Task Manager UI with logged-in user and added tasks.
5. **Screenshot 5: Docker Desktop GUI (Optional / Recommended)**
   - Docker Desktop application showing the `student-portfolio` container group running all 3 containers green, and the Volumes tab showing `mongodb_data`.
6. **Screenshot 6: Data Persistence Verification**
   - Terminal showing `docker compose down` followed by `docker compose up -d`, and browser refresh showing tasks are preserved without loss.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
