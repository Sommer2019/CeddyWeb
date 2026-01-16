const fs = require('fs');
const https = require('https');

// Supabase helper
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

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

async function getAccessToken(clientId, clientSecret) {
  const postData = `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
  const options = {
    hostname: 'id.twitch.tv',
    path: '/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const response = await httpsRequest(options, postData);
  const data = JSON.parse(response.body);
  return data.access_token;
}

async function getBroadcasterId(channelName, accessToken, clientId) {
  const options = {
    hostname: 'api.twitch.tv',
    path: `/helix/users?login=${channelName}`,
    method: 'GET',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`
    }
  };

  const response = await httpsRequest(options);
  const data = JSON.parse(response.body);
  if (data.data && data.data.length > 0) {
    return data.data[0].id;
  }
  throw new Error('Channel not found');
}

async function getClips(broadcasterId, startDate, endDate, accessToken, clientId) {
  let allClips = [];
  let cursor = null;

  do {
    let path = `/helix/clips?broadcaster_id=${broadcasterId}&started_at=${startDate}&ended_at=${endDate}&first=100`;
    if (cursor) {
      path += `&after=${cursor}`;
    }

    const options = {
      hostname: 'api.twitch.tv',
      path: path,
      method: 'GET',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const response = await httpsRequest(options);
    const data = JSON.parse(response.body);

    if (data.data) {
      allClips = allClips.concat(data.data);
    }

    cursor = data.pagination && data.pagination.cursor;
  } while (cursor);

  return allClips;
}

function getLastWeekOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfMonth = lastDay.getDate();
  const startOfLastWeek = new Date(year, month, lastDayOfMonth - 6, 0, 0, 0, 0);
  const endOfLastWeek = new Date(year, month, lastDayOfMonth, 23, 59, 59, 999);
  return { start: startOfLastWeek, end: endOfLastWeek };
}

function getSecondToLastWeekOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfMonth = lastDay.getDate();
  const endOfSecondToLastWeek = new Date(year, month, lastDayOfMonth - 7, 23, 59, 59, 999);
  return { end: endOfSecondToLastWeek };
}

function calculateVotingAndClipsPeriods(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const votingPeriod = getLastWeekOfMonth(year, month);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const clipsStart = getLastWeekOfMonth(prevYear, prevMonth).start;
  const clipsEnd = getSecondToLastWeekOfMonth(year, month).end;
  return {
    votingPeriod,
    clipsPeriod: {
      start: clipsStart,
      end: clipsEnd
    }
  };
}

// Helper to call Supabase REST API
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

async function main() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET');
    process.exit(1);
  }

  // Read config: prefer env TWITCH_CHANNEL, fallback to config file
  let twitchChannel = process.env.TWITCH_CHANNEL;
  const configPath = './votingData/config.json';
  if (!twitchChannel) {
    if (!fs.existsSync(configPath)) {
      console.error('Missing TWITCH_CHANNEL env and no local config found');
      process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    twitchChannel = config.twitchChannel;
    if (!twitchChannel) {
      console.error('twitchChannel not defined in config');
      process.exit(1);
    }
  }

  // Determine date range
  let clipsStartDate, clipsEndDate, votingStartDate, votingEndDate;

  if (process.env.MANUAL_START_DATE && process.env.MANUAL_END_DATE) {
    const manualStart = new Date(process.env.MANUAL_START_DATE);
    const manualEnd = new Date(process.env.MANUAL_END_DATE);
    clipsStartDate = manualStart.toISOString();
    clipsEndDate = manualEnd.toISOString();
    const endYear = manualEnd.getFullYear();
    const endMonth = manualEnd.getMonth();
    const votingPeriod = getLastWeekOfMonth(endYear, endMonth);
    votingStartDate = votingPeriod.start.toISOString();
    votingEndDate = votingPeriod.end.toISOString();
  } else if (process.env.VOTING_START_DATE && process.env.VOTING_END_DATE) {
    clipsStartDate = new Date(process.env.VOTING_START_DATE).toISOString();
    clipsEndDate = new Date(process.env.VOTING_END_DATE).toISOString();
    votingStartDate = clipsStartDate;
    votingEndDate = clipsEndDate;
  } else {
    const now = new Date();
    const periods = calculateVotingAndClipsPeriods(now);
    clipsStartDate = periods.clipsPeriod.start.toISOString();
    clipsEndDate = periods.clipsPeriod.end.toISOString();
    votingStartDate = periods.votingPeriod.start.toISOString();
    votingEndDate = periods.votingPeriod.end.toISOString();
  }

  console.log(`Fetching clips from ${clipsStartDate} to ${clipsEndDate}`);
  console.log(`Voting period will be from ${votingStartDate} to ${votingEndDate}`);

  // Get access token
  const accessToken = await getAccessToken(clientId, clientSecret);

  // Get broadcaster ID
  const broadcasterId = await getBroadcasterId(twitchChannel, accessToken, clientId);
  console.log(`Broadcaster ID: ${broadcasterId}`);

  // Fetch clips
  const clips = await getClips(broadcasterId, clipsStartDate, clipsEndDate, accessToken, clientId);
  console.log(`Fetched ${clips.length} clips`);

  // Delete old clips in period from Supabase
  // Supabase REST: DELETE /rest/v1/clips?created_at=gte.<start>&created_at=lte.<end>
  const deletePath = `${SUPABASE_URL}/rest/v1/clips?created_at=gte.${encodeURIComponent(clipsStartDate)}&created_at=lte.${encodeURIComponent(clipsEndDate)}`;
  const delRes = await supabaseRequest(deletePath, 'DELETE', null, { Prefer: 'return=representation' });
  if (delRes.statusCode >= 400) {
    console.error('Error deleting old clips:', delRes.statusCode, delRes.body);
    process.exit(1);
  }
  console.log('Deleted old clips in the period (if any)');

  // Upsert new clips
  const clipsToUpsert = clips.map(clip => ({
    id: clip.id,
    url: clip.url,
    embed_url: clip.embed_url,
    broadcaster_id: clip.broadcaster_id,
    broadcaster_name: clip.broadcaster_name,
    creator_id: clip.creator_id,
    creator_name: clip.creator_name,
    video_id: clip.video_id,
    game_id: clip.game_id,
    language: clip.language,
    title: clip.title,
    view_count: clip.view_count,
    created_at: clip.created_at,
    thumbnail_url: clip.thumbnail_url,
    duration: clip.duration,
    vod_offset: clip.vod_offset
  }));

  if (clipsToUpsert.length > 0) {
    const upsertPath = `${SUPABASE_URL}/rest/v1/clips`;
    const upsertRes = await supabaseRequest(upsertPath, 'POST', clipsToUpsert, { Prefer: 'resolution=merge-duplicates,return=representation' });
    if (upsertRes.statusCode >= 400) {
      console.error('Error upserting clips:', upsertRes.statusCode, upsertRes.body);
      process.exit(1);
    }
    console.log('Upserted clips to Supabase');
  } else {
    console.log('No clips to upsert');
  }

  console.log('Clips processed and saved to Supabase successfully');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
