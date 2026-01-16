const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
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

function formatMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function main() {
  const today = new Date();

  // Only calculate results on the last day of the month
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (tomorrow.getDate() !== 1) {
    console.log('Not the last day of the month yet, skipping calculation');
    return;
  }

  // Determine month_key for the month that just ended
  const monthKey = formatMonthKey(today);

  // Fetch all clips for the relevant period from Supabase
  const clipsRes = await supabaseRequest(`${SUPABASE_URL}/rest/v1/clips?select=*&order=view_count.desc`);
  if (clipsRes.statusCode >= 400) {
    console.error('Error fetching clips:', clipsRes.statusCode, clipsRes.body);
    process.exit(1);
  }
  const clips = JSON.parse(clipsRes.body || '[]');

  // Aggregate votes per clip using Supabase RPC / or client-side aggregation
  const votesRes = await supabaseRequest(`${SUPABASE_URL}/rest/v1/votes?select=clip_id`);
  if (votesRes.statusCode >= 400) {
    console.error('Error fetching votes:', votesRes.statusCode, votesRes.body);
    process.exit(1);
  }
  const votes = JSON.parse(votesRes.body || '[]');

  // Count votes per clip
  const voteCount = {};
  for (const v of votes) {
    voteCount[v.clip_id] = (voteCount[v.clip_id] || 0) + 1;
  }

  // Attach counts to clips
  const clipsWithVotes = clips.map(clip => ({ ...clip, votes: voteCount[clip.id] || 0 }));

  // Sort by votes desc, view_count tiebreaker
  clipsWithVotes.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return b.view_count - a.view_count;
  });

  // Build top results (top10 including ties)
  const results = [];
  let minVotesForTop10 = 0;
  for (let i = 0; i < clipsWithVotes.length; i++) {
    if (i < 10) {
      results.push(clipsWithVotes[i]);
      if (i === 9) minVotesForTop10 = clipsWithVotes[i].votes;
    } else if (minVotesForTop10 > 0 && clipsWithVotes[i].votes === minVotesForTop10) {
      results.push(clipsWithVotes[i]);
    } else break;
  }

  const resultsData = {
    results,
    calculatedAt: new Date().toISOString(),
    period: {},
    totalVotes: votes.length
  };

  // Upsert results into Supabase results table using month_key as primary key
  const insertPath = `${SUPABASE_URL}/rest/v1/results`;
  const insertBody = { month_key: monthKey, data: resultsData };
  const insertRes = await supabaseRequest(insertPath, 'POST', insertBody, { Prefer: 'resolution=merge-duplicates,return=representation' });
  if (insertRes.statusCode >= 400) {
    console.error('Error writing results:', insertRes.statusCode, insertRes.body);
    process.exit(1);
  }
  console.log('Results saved to Supabase');

  // Update config table -> set status closed if exists
  const configUpdatePath = `${SUPABASE_URL}/rest/v1/config`;
  const configBody = [{ key: 'status', value: JSON.stringify('closed') }];
  await supabaseRequest(configUpdatePath, 'POST', configBody, { Prefer: 'resolution=merge-duplicates' });

  console.log(`Results calculated: ${results.length} clips in top results`);
  console.log(`Total votes: ${resultsData.totalVotes}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
