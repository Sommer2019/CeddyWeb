// Quick test for computeIpHash
const { computeIpHash } = require('../api/submit-vote');

process.env.IP_SALT = process.env.IP_SALT || 'test_salt';

const ip = '203.0.113.42';
const hash = computeIpHash(ip);
console.log('ip:', ip);
console.log('ip_hash:', hash);

