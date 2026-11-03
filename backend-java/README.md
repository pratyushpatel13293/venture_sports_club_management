# Venture Sports Club: Java Backend (Spring Boot + MySQL)

This is the Java version of the Venture backend. It replaces `../Backend` (Node.js + Express + MongoDB) and
keeps the same REST URLs and JSON shapes, so the React app in `../Frontend` works against it.
The only frontend changes are in the real-time code.

| Concern        | Node backend (old)          | Java backend (this folder)                          |
|----------------|-----------------------------|-----------------------------------------------------|
| Server         | Express 4                   | Spring Boot 3.4 (Spring MVC, embedded Tomcat)       |
| Database       | MongoDB + Mongoose          | MySQL + Spring Data JPA / Hibernate                 |
| Auth           | jsonwebtoken + middleware   | Spring Security filter chain + JJWT                 |
| Passwords      | bcryptjs                    | `BCryptPasswordEncoder`                             |
| Real-time      | Socket.IO                   | Spring WebSocket + STOMP                            |
| E-mail OTP     | Resend (never wired up)     | Spring Mail (SMTP) + `@Scheduled` cleanup           |
| AI commentary  | `fetch` to Gemini           | Spring `RestClient` with timeouts and fallback text |
| Config         | dotenv                      | `application.yml` + `.env` import                   |
| Dev reload     | nodemon                     | spring-boot-devtools                                |
| Tests          | none                        | JUnit 5 + MockMvc + STOMP client, H2 in-memory DB   |

## Run it

**You need:** Java 17+, Maven 3.9+, and MySQL 8.

```bash
cd backend-java
cp .env.example .env          # then edit .env: DB password + two JWT secrets
mvn spring-boot:run           # starts on http://localhost:8080
```

The tables are created automatically on first start (`ddl-auto: update`). Check it's running:
`curl http://localhost:8080/health` should return `{"status":"OK"}`.

**Frontend:**

```bash
cd ../Frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8080
npm install
npm run dev                   # http://localhost:5173
```

**Tests** (no MySQL needed, they use the in-memory H2 database):

```bash
mvn test
```

## Project layout (package by feature)

```
com.venture.sports
├── config/      SecurityConfig, WebSocketConfig, AppProperties (typed application.yml)
├── security/    JwtService, JwtAuthFilter, RestAuthEntryPoint, AuthUser
├── common/      BaseEntity (UUID id + timestamps), ApiException, GlobalExceptionHandler, Finder
├── web/         Views (all response DTOs), ViewMapper (entity -> DTO), HomeController
├── auth/        signup/login/refresh, OTP forgot-password, e-mail
├── user/        User, Notification
├── club/        Club, club chat
├── event/       Event, rules, updates, support queries, edit, cascade delete
├── team/        Team, invitations
├── schedule/    Schedule (match days)
├── match/       Match, rounds, Stage, BracketService, LiveMatchService, MatchEngine
├── ai/          prediction, highlights, smart scheduler, GeminiClient
└── realtime/    STOMP auth interceptor, @MessageMapping handlers, RealtimePublisher
```

Every feature follows the same layers:

```
HTTP JSON ─> @RestController ─> @Service (@Transactional, business rules) ─> Repository ─> MySQL
                    ▲                         │
                    └──── DTO (Views) <───────┘  (ViewMapper; entities never leave the service)
```

## Changes compared with the Node version

The Java version keeps the same API, but these Node behaviours were bugs, so they were fixed instead of copied:

1. **Socket.IO never actually ran.** `server.js` attached Socket.IO to `httpServer` but started a different
   server with `app.listen()`. Real-time now works over STOMP on the `/ws` endpoint.
2. **JWT secret fallback `"ava"`.** If the secret env variable was missing, anyone could forge tokens.
   The app now refuses to start without two secrets of at least 32 characters each.
3. **Missing permission checks.** In Node, any logged-in user could update scores, start matches or create
   schedules for any event. Some reads (`/teams/...`, `/match/schedule/...`, `/match/{id}`) didn't even
   need a token. Now every route except signup/login/refresh/forgot-password requires a token, and
   staff-only actions check admin/manager rights.
4. **Forgot-password was never connected.** The frontend called `/auth/forgot-password` and
   `/auth/verify-forgot-otp`, but those routes didn't exist. Both are implemented now: OTPs are hashed,
   expire after 10 minutes, allow 5 attempts and work only once. `/auth/search-users` was also missing.
5. **Bracket generation crashed.** `Match.create` without the required `scheduleid` failed, and
   `stageid` wasn't in the Mongoose schema, so it was silently dropped. The bracket is now built in one
   transaction, and bye winners advance automatically.
6. **Locking a bracket was impossible.** The old code required every match in every round to have two
   teams, but later rounds are only filled as winners advance. Now only round 1 must be complete.
7. **Tied matches got an arbitrary winner.** Ending a match with equal round wins now asks for another round.
8. **Leadership transfer removed the new leader from the members list.** The leader is now always a member.
9. **Leave/delete used fields that don't exist.** `/clubs/leave` used `members`, `players` and `Team.event`,
   so it removed the user from almost nothing. `/clubs/delete` removed the event but left its teams,
   schedules and matches behind as orphans. Both now clean up properly, in one transaction, so either
   everything is removed or nothing is.
10. **Login no longer reveals which e-mails exist.** Wrong e-mail and wrong password give the same message.

Frontend changes:

- `src/socket.js` is now a small STOMP client with the same `io()/on()/emit()` API the components used.
  In five components the only change is the import line.
- `package.json`: `socket.io-client` was replaced with `@stomp/stompjs`, and the stray `nodemon` dependency
  was removed.
- Bug fixes: `axios.delete` sent no body in `event.jsx`, a double `}` broke a URL in `schedule.jsx`, and an
  absolute-URL fallback in `AdminEventQueries.jsx` was replaced with a relative path.

## What is simulated (say this honestly if asked)

The AI widgets combine **real** data with **simulated** data:

- **Real:** win rate, recent form, head-to-head, win streak, and round score lines, all computed from
  finished matches.
- **Simulated:** K/D ratio, rank, bonus, and the MVP's kills/deaths/assists. They come from a hash of the
  team or match id (`DeterministicStats`), so they stay stable between page loads, but they are not
  measured. The platform doesn't record player-level stats.
- **Commentary text:** written by Gemini if `GEMINI_API_KEY` is set, otherwise by a template.

## API reference

All routes need `Authorization: Bearer <accessToken>` unless marked *public*.

| Method | Path | Purpose |
|---|---|---|
| POST | /auth/signup, /auth/login *(public)* | create account / log in → tokens |
| POST | /auth/{clubId}/signup, /auth/{clubId}/login *(public)* | same, and join the club |
| POST | /auth/refresh *(public)* | new access token from refresh token |
| GET  | /auth/me | current user |
| POST | /auth/search-users | `{q}` → up to 10 users |
| POST | /auth/forgot-password, /auth/verify-forgot-otp *(public)* | OTP flow |
| POST | /auth/reset-password *(public)* | logged in, or after a verified OTP |
| POST | /clubs/new, /clubs/join, /clubs/leave | club membership |
| GET  | /clubs/my-admin, /clubs/participant, /clubs/{id} | club lists / detail |
| GET/POST | /clubs/{id}/chat | announcements (admin posts) |
| DELETE | /clubs/delete | `{clubid}` delete club · `{eventid}` delete event |
| POST | /events/new, /events/promote, /events/updates, /events/join-event | event management |
| GET  | /events, /events/{id}, /events/club/{clubId}, /events/roles/{id} | event reads |
| GET  | /events/{id}/teams, /events/{id}/schedules | lists |
| GET/POST | /events/{id}/queries | private support chat |
| POST | /events/{id}/schedule | generate knockout bracket |
| PUT  | /events/{id}/lock-schedule | freeze round 1 |
| GET  | /events/{id}/stages, /events/{id}/winner | bracket + champion |
| GET  | /events/matches/{id} | match for live view |
| POST | /events/matches/{id}/start · /round/end · /end | live control |
| PUT  | /events/matches/{id}/round/score | `{team:"A"/"B", points}` |
| PUT  | /events/matches/{id}/teams, /events/{matchId}/result | change teams / admin override |
| POST | /extra/{eventId}/edit-event | edit event + rules |
| GET/POST | /teams/{eventId}, /teams/team/{id}, /teams/new-team … | teams and invites |
| GET/POST | /schedule/{id}, /schedule/{eventId}/new-schedule | match days |
| GET/POST/PUT/DELETE | /match/... | matches inside a schedule |
| GET/POST | /ai/match/{id}/prediction · /highlights · /ai/schedule/{id}/smart-schedule[/apply] | AI widgets |

**WebSocket (STOMP)** at `ws://localhost:8080/ws`. Send `Authorization: Bearer <token>` in the CONNECT frame.

| Direction | Destination | Meaning |
|---|---|---|
| subscribe | `/topic/event/{eventId}` | `match:started`, `match:round:update`, `match:round:ended`, `match:ended`, `chat:new` |
| subscribe | `/topic/club/{clubId}` | `chat:new:club` (club members only) |
| subscribe | `/user/queue/events` | `query:new` (private) |
| subscribe | `/user/queue/ack` | replies to your SENDs, matched by `requestId` |
| send | `/app/chat.send`, `/app/chat.send.club`, `/app/query.send`, `/app/join.organizer` | actions |

Every server message is an envelope: `{"type": "match:round:update", "data": {...}}`.

## Deploying (outline)

1. Create a MySQL database (Railway, Aiven or PlanetScale-compatible MySQL).
2. Run `mvn clean package`, which builds `target/venture-sports-backend-1.0.0.jar`.
3. Host it on Render or Railway with `java -jar target/*.jar`, and set the same variables as in `.env`.
4. Set `VITE_API_URL` on Vercel to the backend URL, and add the Vercel URL to `CORS_ALLOWED_ORIGINS`.
