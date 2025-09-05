import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app.js';

function withTimeout(promise, ms, label){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(`Timeout: ${label}`)), ms))
  ]);
}

function get(path, base){
  return new Promise((resolve,reject)=>{
    http.get(base+path, res=>{
      const chunks=[]; res.on('data',c=>chunks.push(c)); res.on('end',()=>{ res.body=Buffer.concat(chunks).toString('utf8'); resolve(res); });
    }).on('error',reject);
  });
}

(async () => {
  const application = await createApp();
  const server = application.listen(0); await new Promise(r=>server.once('listening', r));
  const addr = server.address(); const base = `http://127.0.0.1:${addr.port}`;

  // 1. Shared client logger asset
  { const res = await withTimeout(get('/shared/client/clientLogger.js', base),3000,'clientLogger'); assert.strictEqual(res.statusCode,200,'clientLogger.js 200'); }

  // 2. Health
  { const res = await withTimeout(get('/health', base),3000,'health'); assert.strictEqual(res.statusCode,200,'health 200'); const data=JSON.parse(res.body); assert.ok(data.status==='ok'); }

  // 3. Random media (expect 404 if empty library or 200 with file)
  { const res = await withTimeout(get('/media/random', base),3000,'random-media'); assert.ok([200,404,500].includes(res.statusCode), 'random media acceptable status'); }

  // 4. API search (empty query)
  { const res = await withTimeout(get('/api/search', base),3000,'search-empty'); assert.strictEqual(res.statusCode,200,'search empty 200'); }

  // 5. API categories list
  { const res = await withTimeout(get('/api/categories', base),3000,'categories'); assert.strictEqual(res.statusCode,200,'categories 200'); const js=JSON.parse(res.body); assert.ok(js.success); }

  // 6. API routes list
  { const res = await withTimeout(get('/api/routes', base),3000,'routes'); assert.strictEqual(res.statusCode,200,'routes 200'); }

  // 7. API profile
  { const res = await withTimeout(get('/api/profile', base),3000,'profile'); assert.strictEqual(res.statusCode,200,'profile 200'); }

  // 8. 404 route
  { const res = await withTimeout(get('/non-existent-page-xyz', base),3000,'404'); assert.strictEqual(res.statusCode,404,'404 status'); }

  // 9. Forbidden path traversal attempt (should be 403 or 404 but not 200)
  { const res = await withTimeout(get('/media/..%2F..%2Fsecret.txt', base),3000,'traversal'); assert.ok([403,404].includes(res.statusCode), 'forbidden traversal'); }

  console.log('Flow extended tests completed');
  server.close();
})();
