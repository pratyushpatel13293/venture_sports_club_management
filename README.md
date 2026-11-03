# Venture Sports Club: Tournament Management Platform

| Folder | What it is |
|---|---|
| `Frontend/` | React 19 + Vite + Tailwind web app |
| `backend-java/` | **Current backend:** Spring Boot 3 + MySQL + Spring Security (JWT) + WebSocket/STOMP. Start with [`backend-java/README.md`](backend-java/README.md) |
| `Backend/` | Original Node.js + Express + MongoDB backend, kept for reference while learning (not needed to run the app) |

Quick start:

```bash
# 1. backend
cd backend-java && cp .env.example .env   # set DB password + JWT secrets
mvn spring-boot:run                       # http://localhost:8080

# 2. frontend (new terminal)
cd Frontend && cp .env.example .env       # VITE_API_URL=http://localhost:8080
npm install && npm run dev                # http://localhost:5173
```

Study guide for the backend: [`backend-java/docs/LEARNING_GUIDE.md`](backend-java/docs/LEARNING_GUIDE.md)
