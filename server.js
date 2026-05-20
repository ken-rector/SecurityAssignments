const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_KEY = process.env.VIDEOS_API_KEY || '';
const VIDEOS_PATH = path.join(__dirname, 'data', 'videos.json');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/update-videos') {
    const authHeader = req.headers['x-api-key'] || '';

    if (!API_KEY || !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(API_KEY))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    let body = '';
    let size = 0;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);

        if (!parsed.videos || !Array.isArray(parsed.videos)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid format. Expected { "videos": [...] }' }));
          return;
        }

        fs.writeFileSync(VIDEOS_PATH, JSON.stringify(parsed, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: parsed.videos.length }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });

    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const port = process.env.PORT || 3001;
server.listen(port);
