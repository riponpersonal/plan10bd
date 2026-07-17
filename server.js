const path = require('path');
process.chdir(__dirname);

// Dynamic Prisma query engine resolver based on OpenSSL version
const opensslVersion = process.versions.openssl || '';
let engineFile = 'libquery_engine-rhel-openssl-1.1.x.so.node';
if (opensslVersion.startsWith('3.')) {
  engineFile = 'libquery_engine-rhel-openssl-3.0.x.so.node';
}

console.error(`[SERVER INIT] Node.js versions:`, JSON.stringify(process.versions));
console.error(`[SERVER INIT] Detected OpenSSL: ${opensslVersion}, loading engine: ${engineFile}`);

process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(__dirname, 'app', 'lib', 'prisma-client', engineFile);

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js app in production mode
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error('Server execution error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.error(`> Application is running on http://${hostname}:${port}`);
    });
});
