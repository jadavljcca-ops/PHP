const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    envLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (e) {
    console.warn('Could not read .env file:', e.message);
  }
}

const PORT = parseInt(process.env.PORT, 10) || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Helper for JSON responses
  const sendJson = (statusCode, obj) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(obj));
  };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Dynamic /env.js endpoint to expose safe client environment variables
  if (reqPath === '/env.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    const clientEnv = {
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
    };
    res.end(`window.__ENV__ = ${JSON.stringify(clientEnv)};`);
    return;
  }

  // Endpoint to save current admin portal dataset into js/data.js
  if (req.method === 'POST' && reqPath === '/api/save-data') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Protect against overly huge payloads (>50MB)
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed || (!parsed.subjects && !parsed.semesters && !parsed.questions && !parsed.units)) {
          sendJson(400, { success: false, message: 'Invalid dataset structure' });
          return;
        }

        const dataJsPath = path.join(__dirname, 'js', 'data.js');
        const fileContent = `/**
 * Default Practicals Data
 * Auto-synchronized from Admin Portal on localhost
 * Last updated: ${new Date().toISOString()}
 */

window.DEFAULT_DATA = ${JSON.stringify(parsed, null, 2)};
`;

        fs.writeFileSync(dataJsPath, fileContent, 'utf8');
        console.log(`[Sync] Successfully updated js/data.js (${parsed.subjects ? parsed.subjects.length : 0} subjects, ${parsed.questions ? parsed.questions.length : 0} questions)`);

        sendJson(200, {
          success: true,
          message: 'Saved to js/data.js successfully',
          counts: {
            semesters: (parsed.semesters || []).length,
            subjects: (parsed.subjects || []).length,
            units: (parsed.units || []).length,
            questions: (parsed.questions || []).length
          }
        });
      } catch (err) {
        console.error('[Sync Error]', err);
        sendJson(500, { success: false, message: err.message });
      }
    });
    return;
  }

  // Endpoint to push code to GitHub directly
  if (req.method === 'POST' && reqPath === '/api/git-push') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let commitMsg = 'Update practicals dataset from admin portal';
      try {
        if (body) {
          const parsed = JSON.parse(body);
          if (parsed && parsed.message) commitMsg = parsed.message;
        }
      } catch (e) {}

      const escapedMsg = commitMsg.replace(/"/g, '\\"');
      const gitCmd = `git add . && git commit -m "${escapedMsg}" && git push origin main`;
      console.log(`[Git Push] Executing: ${gitCmd}`);

      exec(gitCmd, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error('[Git Push Error]:', stderr || error.message);
          sendJson(500, {
            success: false,
            message: 'Git push failed: ' + (stderr || error.message),
            details: stdout
          });
          return;
        }

        console.log('[Git Push Success]:', stdout);
        sendJson(200, {
          success: true,
          message: 'Successfully committed and pushed to GitHub!',
          output: stdout
        });
      });
    });
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
