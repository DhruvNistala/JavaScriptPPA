PPA6: Arrays, DELETE, and Persistent JSON Storage

Run:
  node server.js

Then open:
  http://localhost:3000

API:
  GET /appointments
  POST /appointments
  DELETE /appointments/:index

Notes:
  - appointments.json stores the appointment array.
  - The client re-fetches data after each add or delete.
