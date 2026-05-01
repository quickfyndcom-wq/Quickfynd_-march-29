import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');

function normalizeEmail(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function normalizePhone(value) {
  if (value === null || value === undefined) return '';
  let raw = String(value).trim();
  if (!raw) return '';

  raw = raw.replace(/[\s\-()]/g, '');
  if (raw.startsWith('00')) {
    raw = `+${raw.slice(2)}`;
  }

  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digitsOnly = raw.replace(/\D/g, '');
  if (!digitsOnly) return '';

  if (digitsOnly.length === 10) return `+91${digitsOnly}`;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`;
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) return `+${digitsOnly}`;

  return '';
}

async function connectDB() {
  const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL || '').trim();
  if (!uri) {
    throw new Error('MONGODB_URI (or MONGO_URI/MONGO_URL) is required');
  }
  await mongoose.connect(uri);
}

async function findDuplicateUsersBy(users, key) {
  const map = new Map();
  for (const user of users) {
    const value = user[key];
    if (!value) continue;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(user._id);
  }

  const duplicates = [];
  for (const [value, ids] of map.entries()) {
    if (ids.length > 1) {
      duplicates.push({ value, ids });
    }
  }
  return duplicates;
}

async function normalizeUserIdentityFields(usersCollection) {
  const cursor = usersCollection.find({}, { projection: { _id: 1, email: 1, phone: 1 } });

  let scanned = 0;
  let changed = 0;

  while (await cursor.hasNext()) {
    const user = await cursor.next();
    scanned += 1;

    const nextEmail = normalizeEmail(user.email);
    const nextPhone = normalizePhone(user.phone);

    const prevEmail = typeof user.email === 'string' ? user.email : '';
    const prevPhone = typeof user.phone === 'string' ? user.phone : '';

    const shouldEmailChange = prevEmail !== nextEmail;
    const shouldPhoneChange = prevPhone !== nextPhone;

    if (!shouldEmailChange && !shouldPhoneChange) continue;

    changed += 1;

    if (APPLY) {
      const setObj = {};
      const unsetObj = {};

      if (nextEmail) setObj.email = nextEmail;
      else unsetObj.email = '';

      if (nextPhone) setObj.phone = nextPhone;
      else unsetObj.phone = '';

      const update = {};
      if (Object.keys(setObj).length) update.$set = setObj;
      if (Object.keys(unsetObj).length) update.$unset = unsetObj;

      await usersCollection.updateOne({ _id: user._id }, update);
    }
  }

  return { scanned, changed };
}

async function ensureUserIdentityIndexes() {
  await connectDB();

  const db = mongoose.connection.db;
  const users = db.collection('users');

  console.log(APPLY ? 'Mode: APPLY (writes enabled)' : 'Mode: DRY RUN (no writes)');

  const normalizationStats = await normalizeUserIdentityFields(users);
  console.log(`Scanned users: ${normalizationStats.scanned}`);
  console.log(`Users needing email/phone normalization: ${normalizationStats.changed}`);

  const allUsers = await users
    .find({}, { projection: { _id: 1, email: 1, phone: 1 } })
    .toArray();

  const normalizedUsers = allUsers.map((u) => ({
    _id: u._id,
    email: normalizeEmail(u.email),
    phone: normalizePhone(u.phone),
  }));

  const emailDuplicates = await findDuplicateUsersBy(normalizedUsers, 'email');
  const phoneDuplicates = await findDuplicateUsersBy(normalizedUsers, 'phone');

  if (emailDuplicates.length || phoneDuplicates.length) {
    console.error('Duplicate identities found. Resolve these before enforcing unique indexes.');
    if (emailDuplicates.length) {
      console.error('Email duplicates:');
      emailDuplicates.slice(0, 20).forEach((d) => {
        console.error(`  ${d.value}: ${d.ids.join(', ')}`);
      });
    }
    if (phoneDuplicates.length) {
      console.error('Phone duplicates:');
      phoneDuplicates.slice(0, 20).forEach((d) => {
        console.error(`  ${d.value}: ${d.ids.join(', ')}`);
      });
    }
    process.exitCode = 1;
    return;
  }

  const indexes = await users.indexes();
  const identityIndexes = indexes.filter((idx) => {
    const key = Object.keys(idx.key || {});
    return key.length === 1 && (key[0] === 'email' || key[0] === 'phone');
  });

  console.log('Existing email/phone indexes:');
  identityIndexes.forEach((idx) => {
    console.log(`  ${idx.name}: ${JSON.stringify(idx)}`);
  });

  for (const idx of identityIndexes) {
    const isDesiredEmail =
      JSON.stringify(idx.key) === JSON.stringify({ email: 1 }) &&
      idx.unique === true &&
      JSON.stringify(idx.partialFilterExpression || {}) ===
        JSON.stringify({ email: { $type: 'string', $nin: ['', null] } });

    const isDesiredPhone =
      JSON.stringify(idx.key) === JSON.stringify({ phone: 1 }) &&
      idx.unique === true &&
      JSON.stringify(idx.partialFilterExpression || {}) ===
        JSON.stringify({ phone: { $type: 'string', $nin: ['', null] } });

    if (isDesiredEmail || isDesiredPhone) continue;

    if (APPLY) {
      console.log(`Dropping index ${idx.name}`);
      await users.dropIndex(idx.name);
    } else {
      console.log(`Would drop index ${idx.name}`);
    }
  }

  const emailIndex = {
    key: { email: 1 },
    name: 'email_unique_non_empty',
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $nin: ['', null] } },
  };

  const phoneIndex = {
    key: { phone: 1 },
    name: 'phone_unique_non_empty',
    unique: true,
    partialFilterExpression: { phone: { $type: 'string', $nin: ['', null] } },
  };

  if (APPLY) {
    await users.createIndex(emailIndex.key, {
      name: emailIndex.name,
      unique: emailIndex.unique,
      partialFilterExpression: emailIndex.partialFilterExpression,
      background: true,
    });
    await users.createIndex(phoneIndex.key, {
      name: phoneIndex.name,
      unique: phoneIndex.unique,
      partialFilterExpression: phoneIndex.partialFilterExpression,
      background: true,
    });
    console.log('Created/ensured target indexes.');
  } else {
    console.log(`Would ensure index: ${JSON.stringify(emailIndex)}`);
    console.log(`Would ensure index: ${JSON.stringify(phoneIndex)}`);
  }

  const finalIndexes = await users.indexes();
  console.log('Final indexes snapshot:');
  finalIndexes.forEach((idx) => console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`));
}

ensureUserIdentityIndexes()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Migration failed:', error);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
