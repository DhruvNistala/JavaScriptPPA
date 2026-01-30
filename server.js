import http from "http";
import fs from "fs";


const server = http.createServer((req, res) => {
  let filePath = "./public/index.html";
  if (req.url === "/provider") {
    filePath = "./public/provider.html";
  }
  if (req.url === "/client") {
    filePath = "./public/client.html";
  }
  // GET /api/slots
  // Returns all appointment slots as JSON
  if (req.url === "/api/slots" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(slots));
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end("Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(content);
  });
});
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

// In-memory data model for appointment slots
// This data lives only in memory for now
// Persistence will be added in a later assignment
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
  }
];

