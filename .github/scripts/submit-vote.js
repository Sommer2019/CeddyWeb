const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const IP_SALT = process.env.IP_SALT || null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Constants for voting period calculation
const VOTING_PERIOD_DAYS = 7; // Last 7 days of the month

function getLastWeekOfMonth(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfMonth = lastDay.getDate();
  const startOfLastWeek = new Date(year, month, lastDayOfMonth - (VOTING_PERIOD_DAYS - 1), 0, 0, 0, 0);
  const endOfLastWeek = new Date(year, month, lastDayOfMonth, 23, 59, 59, 999);
  return { start: startOfLastWeek, end: endOfLastWeek };
}

function isInLastWeekOfMonth(now = new Date()) {
  const lastWeek = getLastWeekOfMonth(now);
  return now >= lastWeek.start && now <= lastWeek.end;
}

function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function supabaseRequest(path, method = 'GET', body = null, extraHeaders = {}) {
  const url = new URL(path, SUPABASE_URL);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method,
    headers: Object.assign({
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
    }, extraHeaders)
  };
  const postData = body ? JSON.stringify(body) : null;
  if (postData) options.headers['Content-Type'] = 'application/json';
  const res = await httpsRequest(options, postData);
  return res;
}

function computeIpHash(ip) {
  if (!ip) return null;
  if (!IP_SALT) {
    console.warn('IP_SALT not set; using raw IP as fallback for ip_hash');
    return ip;
  }
  return crypto.createHmac('sha256', IP_SALT).update(ip).digest('hex');
}

async function main() {
  const clipId = process.env.CLIP_ID;
  const clientIp = process.env.CLIENT_IP || process.env.IP || process.env.IP_ADDRESS || null;

  if (!clipId || !clientIp) {
    console.error('Missing CLIP_ID or CLIENT_IP');
    process.exit(1);
  }

  // Check voting active
  const now = new Date();
  if (!isInLastWeekOfMonth(now)) {
    console.log('Voting is not active (not in the last week of the month)');
    process.exit(0);
  }

  const ipHash = computeIpHash(clientIp);

  // Verify clip exists
  const clipCheckPath = `${SUPABASE_URL}/rest/v1/clips?id=eq.${encodeURIComponent(clipId)}&select=id`;
  const clipRes = await supabaseRequest(clipCheckPath, 'GET');
  if (clipRes.statusCode >= 400) {
    console.error('Error checking clip existence:', clipRes.statusCode, clipRes.body);
    process.exit(1);
  }
  const clipRows = JSON.parse(clipRes.body || '[]');
  if (!clipRows || clipRows.length === 0) {
    console.error('Clip not found in DB');
    process.exit(1);
  }

  // Check if this IP hash already voted for this clip
  const voteCheckPath = `${SUPABASE_URL}/rest/v1/votes?clip_id=eq.${encodeURIComponent(clipId)}&ip_hash=eq.${encodeURIComponent(ipHash)}&select=id`;
  const voteCheckRes = await supabaseRequest(voteCheckPath, 'GET');
  if (voteCheckRes.statusCode >= 400) {
    console.error('Error checking existing vote:', voteCheckRes.statusCode, voteCheckRes.body);
    process.exit(1);
  }
  const existingVotes = JSON.parse(voteCheckRes.body || '[]');
  if (existingVotes && existingVotes.length > 0) {
    console.log('IP has already voted for this clip');
    process.exit(0);
  }

  // Insert vote with ip_hash
  const insertPath = `${SUPABASE_URL}/rest/v1/votes`;
  const voteBody = { clip_id: clipId, ip_hash: ipHash };
  const insertRes = await supabaseRequest(insertPath, 'POST', voteBody, { Prefer: 'return=representation' });
  if (insertRes.statusCode >= 400) {
    console.error('Error inserting vote:', insertRes.statusCode, insertRes.body);
    process.exit(1);
  }

  console.log('Vote recorded successfully');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
