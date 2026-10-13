#!/usr/bin/env node
/**
 * Optional lightweight server for shared CollAgora Canvas workshops.
 *
 * This is intentionally separate from the browser-only, local-first core app.
 * It is only needed when a facilitator wants several devices on the same
 * network to see the same live canvas during a workshop. The app works fully
 * offline without this server.
 *
 * Usage:
 *   node server/server.js [port]
 *
 * What it does:
 *   1. Serves the static app (index.html, app.js, styles.css, vendor/, templates/)
 *      so other devices on the network can open it in a browser.
 *   2. Exposes a WebSocket endpoint at /ws?room=<code> that keeps the most
 *      recent project JSON for each room in memory and rebroadcasts updates
 *      to every other connected client in that room (last-write-wins).
 *
 * No project data is persisted to disk; everything lives only in memory for
 * the lifetime of the process, matching the app's local-first philosophy.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { WebSocketServer } = require('ws');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_PORT = 8787;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// room code -> { clients: Set<WebSocket>, latestProject: object|null }
const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, { clients: new Set(), latestProject: null });
  }
  return rooms.get(code);
}

function resolveSafePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decoded === '/' ? '/index.html' : decoded);
  const fullPath = path.join(ROOT_DIR, normalized);
  if (!fullPath.startsWith(ROOT_DIR)) return null; // guard against path traversal
  return fullPath;
}

function serveStatic(req, res) {
  const fullPath = resolveSafePath(req.url);
  if (!fullPath) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  fs.readFile(fullPath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function startServer(port = DEFAULT_PORT) {
  const server = http.createServer(serveStatic);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url, 'http://localhost');
    const roomCode = (url.searchParams.get('room') || 'workshop').slice(0, 64);
    const room = getRoom(roomCode);
    room.clients.add(socket);

    if (room.latestProject) {
      socket.send(JSON.stringify({ type: 'sync', project: room.latestProject }));
    }

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (error) {
        return;
      }
      if (message.type === 'update' && message.project) {
        room.latestProject = message.project;
        room.clients.forEach((client) => {
          if (client !== socket && client.readyState === client.OPEN) {
            client.send(JSON.stringify({ type: 'update', project: message.project }));
          }
        });
      }
    });

    socket.on('close', () => {
      room.clients.delete(socket);
      if (room.clients.size === 0 && !room.latestProject) rooms.delete(roomCode);
    });
  });

  server.listen(port, () => {
    const boundPort = server.address().port;
    console.log(`CollAgora Canvas shared-workshop server running at http://localhost:${boundPort}`);
    console.log(`WebSocket sync endpoint: ws://localhost:${boundPort}/ws?room=<code>`);
    console.log('This is optional: the app still works fully offline without this server.');
  });

  return server;
}

if (require.main === module) {
  // Platform hosts (e.g. DigitalOcean App Platform, Heroku) inject PORT and
  // expect the process to bind to it; an explicit CLI argument still wins
  // for local/manual runs, e.g. `node server/server.js 9000`.
  const port = Number.parseInt(process.argv[2], 10)
    || Number.parseInt(process.env.PORT, 10)
    || DEFAULT_PORT;
  startServer(port);
}

module.exports = { startServer, resolveSafePath };
