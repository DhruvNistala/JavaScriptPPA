# Thrive — Digital Fitness & Disease Management

A desktop web app for chronic condition patients to track exercise, nutrition, and daily health check-ins. Built in vanilla JavaScript, HTML, and CSS with a Node.js backend.

## Run

```
node server.js
```

Then open `http://localhost:3000`.

## Features

- **Onboarding & Auth** — Multi-step onboarding collects health profile; accounts use scrypt-hashed passwords with session tokens
- **Daily Check-in** — Submit pain, fatigue, mood, and symptoms → server generates a personalized workout recommendation
- **Dashboard** — Greets user with today's recommended workout and weekly stats
- **Progress** — Animated SVG rings + weekly bar chart + searchable workout history
- **Search** — Browse and filter 10 exercises by category, intensity, and tags
- **Nutrition** — Log meals, track calories consumed vs. burned (pulled from today's workouts), animated donut chart
- **Profile** — View and edit personal info, health condition, and goals
- **Workout** — Guided workout timer with exercise steps, heart rate simulation, and auto-save on completion

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account, returns session token |
| `POST` | `/api/auth/login` | Login, returns session token |
| `POST` | `/api/auth/logout` | Invalidate session |
| `GET` | `/api/auth/me` | Validate current token |
| `GET` | `/api/profile` | Get user profile |
| `PUT` | `/api/profile` | Update user profile |
| `GET` | `/api/checkins` | List all check-ins |
| `GET` | `/api/checkins/latest` | Get most recent check-in + recommendation |
| `POST` | `/api/checkins` | Submit check-in, returns generated recommendation |
| `GET` | `/api/workouts` | List all workouts |
| `POST` | `/api/workouts` | Log a workout |
| `GET` | `/api/meals?date=YYYY-MM-DD` | List meals (optionally filtered by date) |
| `POST` | `/api/meals` | Log a meal |
| `DELETE` | `/api/meals/:id` | Remove a meal |

## Data Flow Example

User submits check-in form → `POST /api/checkins` → server runs `generateRecommendation({pain, fatigue, symptoms})` → saves to `data/users/{id}/checkins.json` → returns recommendation object → UI renders the personalized workout card.

## Storage

Per-user data is isolated under `data/users/{id}/`. Files: `profile.json`, `checkins.json`, `workouts.json`, `meals.json`. Global auth state is in `data/users.json` and `data/sessions.json`.

## System Limitations

- **Health data stored in plaintext** — Profile fields (condition, medication, goals) are stored in unencrypted JSON files. This system is a prototype and should not be used to store real medical records.
- **No real wearable integration** — Heart rate during workouts is simulated; there is no connection to actual fitness devices or health APIs.
- **Workout recommendations are rule-based** — The recommendation engine uses a fixed 5-tier logic based on pain/fatigue/symptoms. It is not a substitute for professional medical or physiotherapy advice.
- **File-based storage does not scale** — JSON files work for a single-user or demo context but are not suitable for concurrent multi-user production use.
- **Sessions do not expire automatically** — Session tokens have a 7-day TTL but are only cleaned up on the next login or logout; expired tokens linger in `sessions.json` until then.
- **No input sanitization beyond type checks** — The server validates required fields and types but does not sanitize free-text inputs against injection attacks.
