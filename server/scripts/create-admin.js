// Usage: npm run create-admin -- admin@company.com [password] ["Full Name"]
// Promotes an existing account to admin, or creates one (password required for new accounts).
const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
const config = require('../config'), User = require('../models/User');
(async () => {
  const [email, password, name] = process.argv.slice(2);
  if (!email) throw new Error('Usage: npm run create-admin -- <email> [password] [name]');
  await mongoose.connect(config.mongoUri);
  const e = email.toLowerCase(), u = await User.findOne({ email: e });
  if (u) {
    await User.updateOne({ _id: u._id }, { $set: { role: 'admin', isActive: true }, $inc: { tokenVersion: 1 } });
    console.log(`Promoted ${e} to admin.`);
  } else {
    if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('A new admin needs a password of 8+ characters with a letter and a number.');
    await User.create({ name: name || 'Administrator', email: e, role: 'admin', isActive: true, password: await bcrypt.hash(password, config.bcryptRounds) });
    console.log(`Created admin ${e}.`);
  }
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
