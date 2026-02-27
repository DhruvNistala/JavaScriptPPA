"use strict";

const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "appointments.json");
let appointments = [];

function loadAppointments() {
  try {
    const text = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      appointments = data;
    } else {
      appointments = [];
      console.warn("appointments.json was not an array.");
    }
  } catch (error) {
    appointments = [];
    console.warn("Could not read appointments.json.");
  }
}

function saveAppointments() {
  const text = JSON.stringify(appointments, null, 2);
  try { // using file system
    fs.writeFileSync(DATA_FILE, text, "utf8");
  } catch (error) {
    console.error("Failed to write appointments.json:", error.message);
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain" });
  response.end(message);
}

function parseJsonBody(text) {
  if (!text || !text.trim()) {
    return { ok: false, error: "Request body empty" };
  }
  try {
    const value = JSON.parse(text);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: "Invalid JSON" };
  }
}

function validateAppointment(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Appointment must be an object" };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const datetime = typeof input.datetime === "string" ? input.datetime.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  if (!datetime) {
    return { ok: false, error: "Date/time is required." };
  }

  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Invalid date/time value." };
  }

  return { ok: true, value: { title, datetime, notes } };
}

loadAppointments();

const server = http.createServer((request, response) => {
  const parsedUrl = url.parse(request.url, true);
  const pathName = parsedUrl.pathname;

  if (request.method === "GET" && pathName === "/appointments") {
    sendJson(response, 200, appointments);
    return;
  }

  if (request.method === "POST" && pathName === "/appointments") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      const parsed = parseJsonBody(body);
      if (!parsed.ok) {
        sendText(response, 400, parsed.error);
        return;
      }

      const validated = validateAppointment(parsed.value);
      if (!validated.ok) {
        sendText(response, 400, validated.error);
        return;
      }

      appointments.push(validated.value);
      saveAppointments();
      sendText(response, 200, "Appointment added.");
    });

    return;
  }

  if (request.method === "DELETE" && pathName.startsWith("/appointments/")) {
    const parts = pathName.split("/");
    const index = Number(parts[2]);

    if (!Number.isInteger(index)) {
      sendText(response, 400, "Invalid appointment index.");
      return;
    }

    if (index >= 0 && index < appointments.length) {
      appointments.splice(index, 1);
      saveAppointments();
      sendText(response, 200, "Appointment deleted.");
    } else {
      sendText(response, 400, "Invalid appointment index.");
    }

    return;
  }

  if (request.method === "GET") {
    let filePath = "";
    let contentType = "text/plain";

    if (pathName === "/" || pathName === "/index.html") {
      filePath = path.join(__dirname, "public", "index.html");
      contentType = "text/html";
    } else if (pathName === "/script.js") {
      filePath = path.join(__dirname, "public", "script.js");
      contentType = "text/javascript";
    } else if (pathName === "/style.css") {
      filePath = path.join(__dirname, "public", "style.css");
      contentType = "text/css";
    } else {
      sendText(response, 404, "Not Found");
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error("Static file error:", err.message);
        sendText(response, 500, "Server error.");
        return;
      }
      response.writeHead(200, { "Content-Type": contentType });
      response.end(content);
    });

    return;
  }

  sendText(response, 404, "Not Found");
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
