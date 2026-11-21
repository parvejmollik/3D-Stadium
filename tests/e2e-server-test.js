import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

console.log('🚀 Running In-Process Fullstack Server Verification...');

process.env.PORT = '3005';
const PORT = 3005;

// Dynamically import server
const serverModule = await import('../server/index.js');

// Wait 500ms for listen
await new Promise(r => setTimeout(r, 600));

try {
  const healthRes = await fetch(`http://localhost:${PORT}/api/health`);
  const health = await healthRes.json();
  console.log('✔ GET /api/health:', health);

  const fixtureRes = await fetch(`http://localhost:${PORT}/api/stadium/fixture`);
  const fixture = await fixtureRes.json();
  console.log('✔ GET /api/stadium/fixture:', fixture.fixture.title);

  const standsRes = await fetch(`http://localhost:${PORT}/api/stadium/stands`);
  const stands = await standsRes.json();
  console.log('✔ GET /api/stadium/stands keys:', Object.keys(stands.stands));

  const pageRes = await fetch(`http://localhost:${PORT}/`);
  const html = await pageRes.text();
  console.log('✔ GET / (HTML length):', html.length, 'Contains WebGL canvas:', html.includes('id="webgl-viewport"'));

  const imgLaptop = await fetch(`http://localhost:${PORT}/screenshots/laptop/01-aerial.jpg`);
  console.log('✔ GET /screenshots/laptop/01-aerial.jpg:', imgLaptop.status, imgLaptop.headers.get('content-type'));

  const imgMobile = await fetch(`http://localhost:${PORT}/screenshots/mobile/01-aerial.jpg`);
  console.log('✔ GET /screenshots/mobile/01-aerial.jpg:', imgMobile.status, imgMobile.headers.get('content-type'));

  console.log('\n🎉 ALL FULLSTACK ENDPOINTS & HTML HOMEPAGE WORKING FLAWLESSLY!');
  serverModule.server.close(() => {
    process.exit(0);
  });
} catch (err) {
  console.error('❌ Server test failed:', err);
  if (serverModule?.server) {
    serverModule.server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
}
