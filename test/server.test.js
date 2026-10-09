const http = require('http');
const { startServer, resolveSafePath } = require('../server/server.js');

describe('optional shared-workshop server', () => {
  test('resolveSafePath keeps traversal attempts contained within the project root', () => {
    const traversalPath = resolveSafePath('/../../../etc/passwd');
    const rootDir = require('path').resolve(__dirname, '..');
    expect(traversalPath.startsWith(rootDir)).toBe(true);
    expect(traversalPath.startsWith(`${rootDir}${require('path').sep}..`)).toBe(false);
    expect(resolveSafePath('/app.js')).toMatch(/app\.js$/);
    expect(resolveSafePath('/')).toMatch(/index\.html$/);
  });

  test('serves index.html and 404s unknown files over HTTP', (done) => {
    const server = startServer(0);
    server.on('listening', () => {
      const port = server.address().port;
      http.get(`http://127.0.0.1:${port}/`, (res) => {
        expect(res.statusCode).toBe(200);
        http.get(`http://127.0.0.1:${port}/does-not-exist.js`, (res2) => {
          expect(res2.statusCode).toBe(404);
          server.close(() => done());
        });
      });
    });
  });
});
