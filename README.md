# PPA 3: Appointment Slot Creation (POST + Validation)

This project extends the scheduling app to support **creating slots** and updating the UI without page reloads.

## Run
`node server.js` then open `http://localhost:3000/provider`.

## API
- `GET /api/slots` → returns all slots (JSON array)
- `POST /api/slots?startTime=...&endTime=...` → creates a slot
  - `201` Created: returns created slot
  - `400` Bad Request: returns `{ "error": "..." }`
  - `409` Conflict: duplicate slot

## Validation + Design Choices
- Server validates required fields, valid date format, and `endTime > startTime`.
- Duplicate start/end times are blocked.
- IDs are auto-assigned in memory.
- Front end (XMLHttpRequest only) shows success/error banners, renders new rows immediately, and loads existing slots on page load.

This aligns with PPA 3 goals: REST status handling, server-side validation, and interactive client behavior.