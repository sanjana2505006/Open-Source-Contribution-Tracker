import '../src/config/dotenv.js';

const origin = (process.env.API_ORIGIN ?? process.env.WEB_ORIGIN)?.replace(/\/$/, '');
const secret = process.env.CRON_SECRET?.trim();

if (!origin) {
  console.error('Missing API_ORIGIN or WEB_ORIGIN');
  process.exit(1);
}

if (!secret) {
  console.error('Missing CRON_SECRET');
  process.exit(1);
}

const url = `${origin}/api/v1/digest/cron/weekly`;
const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();

if (!res.ok) {
  console.error(`Weekly digest cron failed (${res.status}):`, body);
  process.exit(1);
}

console.log('Weekly digest cron OK:', body);
