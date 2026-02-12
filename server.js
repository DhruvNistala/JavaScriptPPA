import http from "http";
import fs from "fs";
import url from "url";  // add new one, from ?startTime=...&endTime=...

console.log("=== Starting server.js ===");

const slots = [
  {
    id: 1,
    startTime: "2026-03-01T09:00",
    endTime: "2026-03-01T09:30",
    status: "available"
  },
  {
    id: 2,
    startTime: "2026-03-01T10:00",
    endTime: "2026-03-01T10:30",
    status: "available"
  },
  {
    id: 3,
    startTime: "2026-03-01T11:00",
    endTime: "2026-03-01T11:30",
    status: "available"
  },
  {
    id: 4,
    startTime: "2026-03-01T14:00",
    endTime: "2026-03-01T14:30",
    status: "available"
  },
  {
    id: 5,
    startTime: "2026-03-01T15:00",
    endTime: "2026-03-01T15:30",
    status: "booked"
  }
];

// new function: waiting for JSON response
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function nextId() {
  return slots.length > 0 ? Math.max(...slots.map(s => s.id)) + 1 : 1;
}

function validateSlotTimes(startTime, endTime) {
  if (typeof startTime !== "string" || startTime.trim().length === 0) {
    return { ok: false, message: "startTime is required" };
  }
  if (typeof endTime !== "string" || endTime.trim().length === 0) {
    return { ok: false, message: "endTime is required" };
  }

  // ** verify time slot and order,  verify endTime is after startTime
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, message: "Invalid date format" };
  }

  if (end <= start) {
    return { ok: false, message: "endTime must be after startTime" };
  }

  return { ok: true, message: "" };
}

function isDuplicate(startTime, endTime) {
  return slots.some(slot =>
    slot.startTime === startTime && slot.endTime === endTime
  );
}

const server = http.createServer((req, res) => {
  console.log("Request:", req.method, req.url);

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const query = parsedUrl.query;

  // GET /api/slots
  if (path === "/api/slots" && req.method === "GET") {
    sendJson(res, 200, slots);
    return;
  }

  // add : POST /api/slots
  if (path === "/api/slots" && req.method === "POST") {
    const startTime = query.startTime;
    const endTime = query.endTime;

    // verify input
    const result = validateSlotTimes(startTime, endTime);
    if (!result.ok) {
      sendJson(res, 400, { error: result.message });
      return;
    }

    // **verify duplicate
    if (isDuplicate(startTime, endTime)) {
      sendJson(res, 409, { error: "Duplicate slot" });
      return;
    }

    // create new slot
    const slot = {
      id: nextId(),
      startTime: startTime,
      endTime: endTime,
      status: "available"
    };

    slots.push(slot);
    console.log("New slot created:", slot);
    sendJson(res, 201, slot);
    return;
  }

  // original format doc
  let filePath = "./public/index.html";
  let contentType = "text/html";

  if (req.url === "/provider") {
    filePath = "./public/provider.html";
  } else if (req.url === "/client") {
    filePath = "./public/client.html";
  } else if (req.url === "/client.js") {
    filePath = "./public/client.js";
    contentType = "text/javascript";
  } else if (req.url === "/provider.js") {
    filePath = "./public/provider.js";
    contentType = "text/javascript";
  } else if (req.url === "/") {
    filePath = "./public/index.html";
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error("Error:", err.message);
      res.writeHead(500);
      res.end("Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

server.listen(3000, () => {
  console.log("==========================================");
  console.log("✅ Server running at http://localhost:3000");
  console.log("==========================================");
});

console.log("=== Setup complete ===");