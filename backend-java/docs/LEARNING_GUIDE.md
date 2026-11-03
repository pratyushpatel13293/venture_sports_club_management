# Learning Guide: Understanding the Java Backend

Use this guide to study the code module by module. Put it (and the code) into a Claude Project, then for each
module ask: *"Explain how <module> works in this project, starting from the problem it solves, and trace one
real request through the code."* After every module, close the chat and **retell it from memory** (out loud
or on paper) before moving on. If you can't retell it, you don't own it yet.

Suggested order (each step uses the previous one):

| Day | Module | Files to read |
|---|---|---|
| 1 | Big picture + one request end-to-end | this guide §1, `VentureApplication`, `AuthController`, `AuthService` |
| 2 | Spring core (beans, DI, config) | `config/AppProperties`, any `@Service` constructor |
| 3 | REST layer, DTOs, errors | `web/Views`, `web/ViewMapper`, `common/GlobalExceptionHandler`, `club/ClubController` |
| 4 | JPA: entities and relationships | `common/BaseEntity`, `event/Event`, `team/Team`, `match/Match`, `match/MatchSide` |
| 5 | JPA: transactions, lazy loading, N+1 | `application.yml` (jpa section), `TeamService`, `EventDeletionService` |
| 6 | Security + JWT | `config/SecurityConfig`, `security/*` |
| 7 | OTP forgot-password | `auth/OtpService`, `auth/OtpCode`, `AuthService.resetPassword` |
| 8 | Bracket algorithm | `match/BracketService`, `match/MatchEngine` |
| 9 | Live scoring | `match/LiveMatchService` |
| 10 | WebSockets / STOMP | `config/WebSocketConfig`, `realtime/*`, `Frontend/src/socket.js` |
| 11 | External API (Gemini), AI widgets | `ai/*` |
| 12 | Tests | `src/test/...` |

---

## 1. One request, end to end

Trace: **a team leader opens the event page**, which runs `GET /events/7f3a.../` with
`Authorization: Bearer eyJ...`.

```
Browser (eventpage.jsx)
   │  GET /events/7f3a...   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIs...
   ▼
Tomcat thread  ──>  CorsFilter (is localhost:5173 allowed? yes)
               ──>  JwtAuthFilter: verify signature + expiry -> AuthUser(id="u1", username="ravi")
                                     put it into SecurityContextHolder
               ──>  AuthorizationFilter: route needs authentication -> OK
               ──>  DispatcherServlet -> EventController.get(me, "7f3a...")
                         │
                         ▼
                    EventService.get()  @Transactional(readOnly = true)
                         │  finder.event("7f3a...")  -> SELECT * FROM events WHERE id='7f3a...'
                         │  event.roleOf("u1")       -> SELECT ... FROM event_admins / event_managers
                         │  mapper.event(event,true) -> SELECT ... FROM teams WHERE event_id=? (lazy, batched)
                         ▼
                    Map {event: EventView, role: "participant"}
                         │
   ◄──── Jackson writes JSON: {"event":{"_id":"7f3a...","name":"Football Cup",...},"role":"participant"}
```

**Retell checkpoint:** What does each filter do? Why does the service, not the controller, convert the
entity into a DTO? (Hint: `open-in-view: false`, so lazy relations only load inside a transaction.)

---

## 2. Spring core: who creates the objects?

**The problem:** `AuthService` needs a `UserRepository`, a `PasswordEncoder`, a `JwtService`... If every
class did `new JwtService(new AppProperties(...))`, swapping one piece (for example a fake e-mail sender in
tests) would mean editing many classes.

**What Spring does:** at startup it scans `com.venture.sports`, creates one instance (a *bean*) of every
`@Service`/`@Component`/`@RestController`/`@Repository`, and passes each one what it needs through its
constructor (*dependency injection*). Lombok's `@RequiredArgsConstructor` writes that constructor for you.

- `AppProperties` is a typed view of `application.yml`. `@Validated` + `@Size(min = 32)` makes startup fail
  if a JWT secret is missing or too short. This *fail-fast* behaviour replaces the old `|| "ava"` fallback.
- In `AuthFlowTest`, `@MockitoBean EmailService` replaces the real bean with a fake one, and no code has to
  change. That's the payoff of DI.

Interview questions: constructor vs field injection? What does `@SpringBootApplication` contain? What is a bean scope?

---

## 3. REST layer: controllers, DTOs, errors

- **Controllers are thin.** They read the path/body, call one service method, and return the result.
- **DTOs (`web/Views`).** Entities never go out as JSON. Three reasons:
  1. Security: `User.password` and `currentRefreshTokenHash` must never leak.
  2. Lazy loading: serializing a lazy relation outside a transaction crashes, or fires many queries.
  3. Contract: the React app was written for MongoDB, so it expects `_id`, `imgURL`, `Sport` and
     `teamA.teamId.teamname`. `@JsonProperty` and the `ViewMapper` produce exactly those names.
- **Errors.** Services throw `ApiException.notFound("Event not found")`, and `GlobalExceptionHandler` turns
  it into `404 {"success":false,"message":"...","error":"..."}`. One place instead of a try/catch in every route.
- **Status codes that matter here:** 400 = bad input, 401 = no or invalid token (the frontend then calls
  `/auth/refresh`), 403 = logged in but not allowed, 404 = not found, 409 = concurrent update.

Interview: `@RestController` vs `@Controller`? Why did login failure return 400 and not 401 here?
(Because the frontend's axios interceptor treats every 401 as "token expired".)

---

## 4. JPA: from Mongo documents to tables

**The problem:** Mongo stored arrays inside documents (`user.clubs`, `club.users`, `event.teams`...). The
same fact was stored in two places, and the copies drifted apart. For example, `/clubs/join` updated
`user.clubs` but not `club.users`.

**In SQL, each relationship has exactly one home:**

```
users ──< club_members >── clubs ──< events ──< teams ──< team_members >── users
                              │          │         └──< team_requests
                              │          ├──< schedules ──< matches >── stages
                              │          ├──< event_rules ──< event_rule_points
                              │          ├──< event_updates
                              │          └──< event_admins / event_managers / event_participants >── users
                              └──< chat_messages
matches ──< match_rounds;  matches.next_match_id ──> matches (self reference = bracket links)
```

Key ideas to be able to explain:

- **Owning vs inverse side.** `Team.event` (`@ManyToOne`) owns the `event_id` foreign key.
  `Event.teams` (`@OneToMany(mappedBy = "event")`) is just a read view. Only changes on the owning side are saved.
- **`@ManyToMany` creates a join table** (`team_members(team_id, user_id)`).
- **`@Embeddable MatchSide`** is stored twice in `matches` with different column names
  (`team_a_id`, `team_b_id`) via `@AttributeOverride`/`@AssociationOverride`.
- **`@ElementCollection`** stores a list of plain strings (rule points) in its own table.
- **UUID string ids** (`BaseEntity`) are used because the frontend compares ids as strings.
- **`equals/hashCode` by id** keeps entities stable inside `HashSet`s.

Interview: what is the N+1 problem, and how did this project reduce it?
(`default_batch_fetch_size: 50` plus `@EntityGraph` on chat and query lists.) Cascade vs `orphanRemoval`?
Why is `Event.rules` cascaded but `Event.teams` isn't?

---

## 5. Transactions, dirty checking, locking

- `@Transactional` on a service method means one DB transaction: everything commits, or everything rolls back.
  Example: `BracketService.generate` creates stages plus 7 matches plus links. If anything fails halfway,
  no half bracket is left behind.
- **Dirty checking.** Inside a transaction you just call `team.setTeamname(...)`. Hibernate notices the change
  and runs the `UPDATE` at commit, with no `save()` call needed. (Look at `TeamService.rename`.)
- **`@Version` on `Match`** is optimistic locking. If two managers update the same match at the same moment,
  the second commit fails instead of silently overwriting the first.
- **`@Transactional(noRollbackFor = ApiException.class)`** in `OtpService.verify` keeps the
  "wrong attempt +1" counter saved even though we throw an error.
- **Publish after commit.** `RealtimePublisher` sends WebSocket messages in `afterCommit()`, so browsers
  never see a score that was rolled back.

Interview: what happens if you call a `@Transactional` method from another method of the same class?
(The proxy is bypassed, so no new transaction starts.)

---

## 6. Security and JWT

**The story.** HTTP is stateless, so each request must prove who sent it. Option 1 is server sessions
(memory per user, sticky servers). Option 2 is a signed token the client carries. This project uses option 2.

- **JWT** = `header.payload.signature`. The payload (`{"sub":"u1","username":"ravi","exp":...}`) is readable
  by anyone. The signature is `HMAC-SHA256(header.payload, secret)`. Change one character and verification fails.
- **Access token** (1 day) goes with every request. **Refresh token** (7 days) is used only at `/auth/refresh`.
  Two different secrets, plus a `type` claim, so one can't be used as the other.
- **Refresh rotation.** Only the SHA-256 hash of the *latest* refresh token is stored on the user. Logging in
  again or resetting the password makes older refresh tokens useless.
- **BCrypt** is slow on purpose (2^10 rounds) and adds a random salt per password, so the same password gives
  different hashes and brute force is expensive.
- **CSRF disabled** because the browser doesn't attach our token automatically (it's not a cookie).
  **CORS** decides which websites may call the API from JavaScript.

Interview: where is the JWT checked (filter vs interceptor vs controller)? How would you log someone out
before the access token expires? (A deny-list or very short tokens, which is the trade-off.)
Why `401` from `RestAuthEntryPoint`?

---

## 7. Forgot-password OTP

```
forgot-password(email) ─> 6-digit SecureRandom code ─> store BCrypt(code), expiresAt = now+10min ─> e-mail
verify(email, code)     ─> latest code, not expired, attempts < 5, BCrypt.matches ─> verifiedAt = now
reset(email, newPass)   ─> verifiedAt set and not expired? ─> change password, delete codes, revoke refresh token
@Scheduled hourly       ─> delete expired codes
```

Things to defend: why `SecureRandom` and not `Math.random()`? Why hash a 6-digit code? (A DB leak shouldn't
give working codes.) Why does `/forgot-password` answer the same for unknown e-mails? (It prevents account
discovery.) What's still missing? (A per-IP rate limit, see §13.)

---

## 8. Knockout bracket algorithm

Trace with 5 teams (`BracketService.generate`):

```
size = nextPowerOfTwo(5) = 8      firstRoundMatches = 5 - 8/2 = 1      byes = 8 - 5 = 3

Quarter Final  slot0: T1 vs T2   slot1: T3 (bye)   slot2: T4 (bye)   slot3: T5 (bye)
                   \             /                    \             /
Semi Final     slot0: W(slot0) vs T3                 slot1: T4 vs T5        (bye winners copied in)
                          \                              /
Final                       slot0: W(SF0) vs W(SF1)
```

Rule: match *i* of round *r* feeds match *i/2* of round *r+1*, as `teamA` if *i* is even, `teamB` if odd.
Each match stores `nextMatch` + `nextSlot`, which makes the bracket a linked structure
(like a binary tree stored bottom-up). The shuffle is `Collections.shuffle` (Fisher-Yates, unbiased),
not `sort(() => Math.random() - 0.5)`, which is biased.

Interview: complexity? (O(n) matches in total: a bracket of size B has B−1 matches.) How would you seed
strong teams apart? How would you support a league (round-robin)?

---

## 9. Live scoring: a state machine

```
UPCOMING ──start──> LIVE ──(score, end round)*──> end ──> FINISHED ──> winner copied into nextMatch
```

`MatchEngine` holds the transitions, so the old `/match/*` routes and the new `/events/matches/*` routes
can't drift apart. Each round stores its own score. The match winner is whoever won more rounds, and a tie
forces another round.

---

## 10. WebSockets with STOMP

**The problem.** HTTP is request→response, so the server can't push a new score. Polling every 2 seconds
wastes requests and still lags. A WebSocket keeps one connection open in both directions.

**STOMP** adds simple messaging on top: `CONNECT`, `SUBSCRIBE /topic/event/42`, `SEND /app/chat.send`,
`MESSAGE`. Spring's in-memory broker routes messages to subscribers.

| Socket.IO idea | STOMP version here |
|---|---|
| `socket.join("event:42")` | `SUBSCRIBE /topic/event/42` |
| `io.to("user:u1").emit(...)` | `convertAndSendToUser("u1", "/queue/events", ...)` → `/user/queue/events` |
| `socket.on("query:send", handler)` | `@MessageMapping("query.send")` |
| ack callback | client sends `requestId`, server replies on `/user/queue/ack` |
| auth in handshake | `StompAuthInterceptor` checks the JWT in the `CONNECT` frame |

Security: the interceptor allows only known destinations, and `/topic/club/{id}` only for club members.
Frontend: `src/socket.js` hides all this behind the same `io()/on()/emit()` API the components already used.

Interview: what breaks with 3 servers behind a load balancer? (The in-memory broker only knows its own
connections. Use RabbitMQ/ActiveMQ as a STOMP relay, or Redis pub/sub.)

---

## 11. Calling an external API (Gemini)

`GeminiClient` uses `RestClient` with connect and read **timeouts**, puts the API key in a **header** (not the
URL, because URLs get logged), and returns `Optional.empty()` on any failure, so the service falls back to
template text. Rule: *an external dependency must never take your endpoint down with it.*

**Honesty point:** K/D, rank and MVP kills are simulated (`DeterministicStats`). Win rate, form,
head-to-head and score lines are real. If an interviewer asks "how do you compute K/D?", say they're
simulated placeholders because the platform doesn't record player stats.

---

## 12. Tests

- `AuthFlowTest`: signup/login/refresh rotation, 401 messages, validation, the full OTP flow (the e-mail
  sender is mocked so the test can read the code).
- `TournamentFlowTest`: club → event → teams → bracket → live match → champion, byes, schedules, manual
  matches, AI widgets, chat, queries, leave/delete cascades.
- `RealtimeTest`: a real server on a random port plus a real STOMP client: live score push, club chat with
  ack, private queries, rejected token, blocked subscription.
- They run on **H2 in MySQL mode**, so `mvn test` works without MySQL. A next step would be Testcontainers
  with a real MySQL in Docker.

---

## 13. Known limitations (good "what would you improve?" answers)

1. `ddl-auto: update` should become **Flyway** migrations (versioned SQL scripts).
2. No **rate limiting** on login and forgot-password (Bucket4j or an API gateway).
3. Tokens live in `localStorage`, which XSS can read. An **httpOnly cookie** for the refresh token is safer.
4. Some lists aren't paginated (`/events`, `/teams/{eventId}`).
5. The in-memory STOMP broker works for **one server only**.
6. Only knockout brackets. League/round-robin isn't implemented (the `Stage.type` column is ready for it).

---

## 14. Interview question bank

Answer each in 2–3 sentences, pointing at the file that proves it:

1. Walk me through what happens when a user logs in.
2. Why two tokens? Why store a hash of the refresh token?
3. How does Spring Security know who the user is on each request?
4. 401 vs 403 in this project, with an example of each.
5. What is a DTO and why didn't you return entities?
6. Explain `@ManyToMany` with `team_members`. Who owns the relationship?
7. What is the N+1 problem? Where could it happen here and how did you avoid it?
8. What does `@Transactional` guarantee in `BracketService.generate`?
9. What does `@Version` protect against? Describe the failure without it.
10. How does the bracket handle 5 teams?
11. How does a score update reach a viewer's browser? (REST → service → afterCommit → STOMP topic → `socket.js`.)
12. How do you secure the WebSocket?
13. What happens if Gemini is down?
14. How is the OTP protected against guessing and reuse?
15. How would you scale this to 10 servers?
16. What would you change before production?
17. Why MySQL instead of MongoDB for this domain? (Highly relational data such as clubs, events, teams and
    members, plus transactions across tables.)
18. What did you migrate, and what bugs did you find in the original? (See the README.)

---

## A note on your resume and honesty

This project involved migrating the backend from Node.js/MongoDB to Java Spring Boot, MySQL/JPA, Spring Security (JWT), and STOMP WebSockets while maintaining compatibility with the existing React frontend.

The implementation was tested, and the backend includes integration tests covering authentication, tournaments, live matches and real-time communication.
