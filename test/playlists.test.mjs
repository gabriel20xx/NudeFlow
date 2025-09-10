import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/app.js';
import { initDb, runMigrations } from '../../NudeShared/server/index.js';

function requestJSON(options, body){
  return new Promise((resolve, reject)=>{
    const req = http.request(options, res=>{
      let data='';
      res.on('data', c=> data+=c);
      res.on('end', ()=>{
        try { resolve({ status: res.statusCode, json: JSON.parse(data||'{}'), headers: res.headers }); }
        catch(e){ resolve({ status: res.statusCode, json: null, text: data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
function cookieHeader(jar){ return jar.join('; '); }
function storeCookies(jar, headers){
  const set = headers['set-cookie'];
  if (!set) return; const arr = Array.isArray(set) ? set : [set];
  for (const cookie of arr){
    const semi = cookie.split(';')[0];
    const [name] = semi.split('=');
    const idx = jar.findIndex(c=> c.startsWith(name+'='));
    if (idx>=0) jar[idx] = semi; else jar.push(semi);
  }
}

async function run(){
  // Ensure DB ready and migrations applied
  await initDb();
  await runMigrations();
  const app = await createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const jar = [];

  try {
    // Signup
    {
      const creds = { email: 'pltest@example.com', password: 'secret12', username: 'pltest' };
      const body = JSON.stringify(creds);
      let res = await requestJSON({ hostname: '127.0.0.1', port, path: '/auth/signup', method: 'POST', headers: { 'Content-Type': 'application/json' } }, body);
      if (res.status === 409) {
        // Already registered, login instead
        const bodyLogin = JSON.stringify({ email: creds.email, password: creds.password });
        res = await requestJSON({ hostname: '127.0.0.1', port, path: '/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, bodyLogin);
        assert.equal(res.status, 200, 'login should succeed');
      } else {
        assert.equal(res.status, 200, 'signup should succeed');
      }
      storeCookies(jar, res.headers);
      assert.ok(res.json && (res.json.user || res.json.data || res.json.ok !== false), 'auth response present');
    }

    // Create playlist
    let playlistId;
    {
      const body = JSON.stringify({ name: 'My First List' });
      const res = await requestJSON({ hostname: '127.0.0.1', port, path: '/api/playlists', method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader(jar) } }, body);
      assert.equal(res.status, 200, 'create playlist ok');
      assert.ok(res.json?.data?.playlist?.id, 'playlist id present');
      playlistId = res.json.data.playlist.id;
    }

    // List playlists
    {
      const res = await requestJSON({ hostname: '127.0.0.1', port, path: '/api/playlists', method: 'GET', headers: { 'Cookie': cookieHeader(jar) } });
      assert.equal(res.status, 200, 'list playlists ok');
      const names = (res.json?.data?.playlists||[]).map(p=>p.name);
      assert.ok(names.includes('My First List'), 'created playlist is listed');
    }

    // Add item to playlist
    {
      const body = JSON.stringify({ mediaKey: '/media/output/sample.mp4' });
      const res = await requestJSON({ hostname: '127.0.0.1', port, path: `/api/playlists/${playlistId}/items`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader(jar) } }, body);
      assert.equal(res.status, 200, 'add item ok');
    }

    // Get items
    {
      const res = await requestJSON({ hostname: '127.0.0.1', port, path: `/api/playlists/${playlistId}/items`, method: 'GET', headers: { 'Cookie': cookieHeader(jar) } });
      assert.equal(res.status, 200, 'list items ok');
      const keys = (res.json?.data?.items||[]).map(x=>x.media_key);
      assert.ok(keys.includes('/media/output/sample.mp4'), 'item appears in playlist');
    }

    // Remove item
    {
    const res = await requestJSON({ hostname: '127.0.0.1', port, path: `/api/playlists/${playlistId}/items?mediaKey=${encodeURIComponent('/media/output/sample.mp4')}`, method: 'DELETE', headers: { 'Cookie': cookieHeader(jar) } });
      assert.equal(res.status, 200, 'remove item ok');
    }

    // Delete playlist
    {
      const res = await requestJSON({ hostname: '127.0.0.1', port, path: `/api/playlists/${playlistId}`, method: 'DELETE', headers: { 'Cookie': cookieHeader(jar) } });
      assert.equal(res.status, 200, 'delete playlist ok');
    }

    console.log('Playlists API smoke test: OK');
  } finally {
    server.close();
  }
}

run().catch(e=>{ console.error('Test failed:', e); process.exit(1); });
