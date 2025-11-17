require('dotenv').config();

const required = ['BOT_TOKEN', 'API_ID', 'API_HASH'];
const miss = required.filter(k => !process.env[k] || !String(process.env[k]).trim());
if (miss.length) {
  console.error('Missing env:', miss.join(', '));
  process.exit(1);
}

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  API_ID: parseInt(process.env.API_ID, 10),
  API_HASH: process.env.API_HASH,
  DELAY_MS: parseInt(process.env.DELAY_MS || '2000', 10),
  DEBUG: process.env.DEBUG === '1'
};
