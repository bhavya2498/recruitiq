const mongoose = require('mongoose');
const config = require('../config');
const { runMigrations, ensureAdmin } = require('../migrations');
(async () => {
  await mongoose.connect(config.mongoUri);
  await runMigrations(); await ensureAdmin();
  console.log('Migration finished.');
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
