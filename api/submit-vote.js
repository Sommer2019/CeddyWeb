// Simple Express server + serverless-compatible handler for submitting votes
// Usage (local): node api/submit-vote.js

const express = require('express');
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const IP_SALT = process.env.IP_SALT || null;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  // Do not exit when used as module; throw only when running directly
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

function getClientIp(req) {
  // X-Forwarded-For may contain a list; take first
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  if (req.ip) return req.ip;
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  return null;
}

function computeIpHash(ip) {
  if (!ip) return null;
  if (!IP_SALT) {
    console.warn('Warning: IP_SALT not set; storing raw IP as fallback for ip_hash. Set IP_SALT in env to enable hashing.');
    return ip;
  }
  return crypto.createHmac('sha256', IP_SALT).update(ip).digest('hex');
}

async function handleSubmitVote(req, res) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server not configured (missing SUPABASE_URL / keys)' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { clip_id } = req.body || {};
    if (!clip_id) return res.status(400).json({ error: 'Missing clip_id' });

    // Check voting period server-side (last week of month)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startOfLastWeek = new Date(year, month, lastDay - 6, 0, 0, 0, 0);
    const endOfLastWeek = new Date(year, month, lastDay, 23, 59, 59, 999);
    if (!(now >= startOfLastWeek && now <= endOfLastWeek)) {
      return res.status(403).json({ error: 'Voting is not active' });
    }

    const clientIp = getClientIp(req);
    if (!clientIp) return res.status(400).json({ error: 'Could not determine client IP' });

    const ipHash = computeIpHash(clientIp);

    // Verify clip exists
    const clipCheckPath = `${SUPABASE_URL}/rest/v1/clips?id=eq.${encodeURIComponent(clip_id)}&select=id`;
    const clipRes = await supabaseRequest(clipCheckPath, 'GET');
    if (clipRes.statusCode >= 400) {
      return res.status(500).json({ error: 'Error checking clip existence' });
    }
    const clipRows = JSON.parse(clipRes.body || '[]');
    if (!clipRows || clipRows.length === 0) {
      return res.status(400).json({ error: 'Clip not found' });
    }

    // Check existing vote by ip_hash
    const voteCheckPath = `${SUPABASE_URL}/rest/v1/votes?clip_id=eq.${encodeURIComponent(clip_id)}&ip_hash=eq.${encodeURIComponent(ipHash)}&select=id`;
    const voteCheckRes = await supabaseRequest(voteCheckPath, 'GET');
    if (voteCheckRes.statusCode >= 400) {
      return res.status(500).json({ error: 'Error checking existing vote' });
    }
    const existing = JSON.parse(voteCheckRes.body || '[]');
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Already voted from this IP' });
    }

    // Insert vote with ip_hash
    const insertPath = `${SUPABASE_URL}/rest/v1/votes`;
    const voteBody = { clip_id: clip_id, ip_hash: ipHash };
    const insertRes = await supabaseRequest(insertPath, 'POST', voteBody, { Prefer: 'return=representation' });
    if (insertRes.statusCode >= 400) {
      return res.status(500).json({ error: 'Error inserting vote' });
    }

    // Optionally return total votes for clip
    const totalRes = await supabaseRequest(`${SUPABASE_URL}/rest/v1/votes?clip_id=eq.${encodeURIComponent(clip_id)}&select=id`);
    const total = (JSON.parse(totalRes.body || '[]') || []).length;

    return res.status(200).json({ success: true, clip_id, totalVotes: total });
  } catch (err) {
    console.error('submit-vote error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// If run as standalone, start an Express server for local testing
if (require.main === module) {
  const app = express();
  app.use(express.json());
  app.post('/submit-vote', handleSubmitVote);
  app.listen(PORT, () => console.log(`submit-vote server listening on http://localhost:${PORT}`));
}

// Export handler and utilities for tests
module.exports = {
  handleSubmitVote,
  computeIpHash
};
