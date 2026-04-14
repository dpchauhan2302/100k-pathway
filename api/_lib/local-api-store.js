const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ─── PHASE 1 FIX: Write mutex ─────────────────────────────────────────────────
// The old code had a read → modify → write pattern with no locking.
// Two concurrent requests (e.g. two simultaneous signups) would both read the
// same users.json, each append their new user, and the second write would
// silently overwrite the first — losing a user record entirely.
//
// This mutex serialises writes to a single file path. It's a per-file queue:
// concurrent reads are still parallel (safe), but writes to the same file are
// queued and execute one at a time.
//
// This is sufficient for a single-process Node.js server. If you ever move to
// multiple worker processes or Vercel serverless (which can run concurrently),
// you'll need an external lock (Redis SETNX, database row lock, etc.) or better
// yet, migrate to Supabase where writes are serialised by the DB itself.

class FileMutex {
  constructor() {
    // Map of filePath → Promise (the tail of the current write queue)
    this._locks = new Map();
  }

  async withLock(filePath, fn) {
    // Chain the new operation onto the end of any existing queue for this file.
    // If there's no queue, start one. The chain ensures FIFO ordering.
    const prev = this._locks.get(filePath) || Promise.resolve();
    const next = prev.then(fn).catch(fn); // run fn even if previous threw
    this._locks.set(filePath, next.catch(() => {})); // don't let errors block the queue
    return next;
  }
}

class LocalApiStore {
  constructor(rootDir = path.join(process.cwd(), 'data')) {
    this.rootDir = rootDir;
    this.usersFile = path.join(rootDir, 'users.json');
    this.interviewsFile = path.join(rootDir, 'interviews.json');
    this.refundsFile = path.join(rootDir, 'refunds.json');
    this.applicationsDir = path.join(rootDir, 'applications');
    this._readyPromise = null;
    this._mutex = new FileMutex();
  }

  async ensureReady() {
    if (!this._readyPromise) {
      this._readyPromise = this.init();
    }
    return this._readyPromise;
  }

  async init() {
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.mkdir(this.applicationsDir, { recursive: true });
    await this.ensureFile(this.usersFile, []);
    await this.ensureFile(this.interviewsFile, []);
    await this.ensureFile(this.refundsFile, []);
  }

  async ensureFile(filePath, defaultValue) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    }
  }

  async readJson(filePath, fallback) {
    await this.ensureReady();
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') return fallback;
      throw error;
    }
  }

  // ─── PHASE 1 FIX: All writes go through the mutex ──────────────────────────
  // Previously: `writeJson` wrote directly with no coordination.
  // Now: every write to a given file is queued behind prior writes to that file.
  async writeJson(filePath, value) {
    await this.ensureReady();
    return this._mutex.withLock(filePath, async () => {
      await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
    });
  }

  // ─── Locked read-modify-write helper ────────────────────────────────────────
  // Combines reading and writing under the same lock so the two operations are
  // atomic with respect to other writers on this file.
  async lockedUpdate(filePath, fallback, updateFn) {
    await this.ensureReady();
    return this._mutex.withLock(filePath, async () => {
      let data;
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        data = JSON.parse(raw);
      } catch (error) {
        if (error.code === 'ENOENT') {
          data = fallback;
        } else {
          throw error;
        }
      }
      const updated = await updateFn(data);
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    });
  }

  toIso(value) {
    if (!value) return new Date().toISOString();
    try {
      return new Date(value).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  normalizePlan(plan) {
    const raw = String(plan || '').trim().toLowerCase();
    if (raw === 'essential') return 'Essential';
    if (raw === 'premium') return 'Premium';
    return 'Standard';
  }

  mapApplicationRecord(record) {
    const id = String(record.id || record.timestamp || crypto.randomUUID());
    return {
      id,
      full_name: record.full_name || record.fullName || '',
      email: record.email || '',
      phone: record.phone || '',
      plan: this.normalizePlan(record.plan),
      experience: record.experience || '',
      target_role: record.target_role || '',
      status: String(record.status || 'PENDING').toUpperCase(),
      submitted_at: this.toIso(record.submitted_at || record.submittedAt || record.timestamp),
      notes: record.notes || '',
      user_id: record.user_id || record.userId || null
    };
  }

  async readApplicationRecordsWithFiles() {
    await this.ensureReady();
    const entries = await fs.readdir(this.applicationsDir);
    const files = entries.filter(file => file.endsWith('.json'));

    const parsed = await Promise.all(
      files.map(async file => {
        const filePath = path.join(this.applicationsDir, file);
        try {
          const raw = await fs.readFile(filePath, 'utf8');
          const record = JSON.parse(raw);
          return { filePath, raw: record, mapped: this.mapApplicationRecord(record) };
        } catch {
          return null;
        }
      })
    );

    return parsed
      .filter(Boolean)
      .sort((a, b) => {
        const aTs = Date.parse(a.mapped.submitted_at) || 0;
        const bTs = Date.parse(b.mapped.submitted_at) || 0;
        return bTs - aTs;
      });
  }

  async listApplications() {
    const records = await this.readApplicationRecordsWithFiles();
    return records.map(entry => entry.mapped);
  }

  async getApplicationById(id) {
    const records = await this.readApplicationRecordsWithFiles();
    const target = records.find(entry => String(entry.mapped.id) === String(id));
    return target ? target.mapped : null;
  }

  async updateApplicationStatus(id, status, notes, updatedBy) {
    // Individual application files each get their own mutex key
    const records = await this.readApplicationRecordsWithFiles();
    const target = records.find(entry => String(entry.mapped.id) === String(id));
    if (!target) return null;

    return this._mutex.withLock(target.filePath, async () => {
      // Re-read inside the lock to get the freshest version
      let current;
      try {
        const raw = await fs.readFile(target.filePath, 'utf8');
        current = JSON.parse(raw);
      } catch {
        current = target.raw;
      }

      current.status = String(status || 'PENDING').toUpperCase();
      current.notes = notes || current.notes || '';
      current.updatedAt = new Date().toISOString();
      current.updatedBy = updatedBy || current.updatedBy || 'system';

      await fs.writeFile(target.filePath, JSON.stringify(current, null, 2), 'utf8');
      return this.mapApplicationRecord(current);
    });
  }

  async listUsers() {
    return this.readJson(this.usersFile, []);
  }

  // ─── PHASE 1 FIX: createUser uses lockedUpdate ───────────────────────────────
  async createUser({ fullName, email, passwordHash, passwordSalt, role, plan,
                     verified, emailVerificationToken, emailVerificationTokenCreatedAt }) {
    return this.lockedUpdate(this.usersFile, [], async (users) => {
      // Double-check for duplicates inside the lock
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (users.some(u => String(u.email || '').toLowerCase() === normalizedEmail)) {
        throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_EXISTS' });
      }

      const now = new Date().toISOString();
      const user = {
        id: crypto.randomUUID(),
        full_name: fullName,
        email: normalizedEmail,
        password_hash: passwordHash,
        password_salt: passwordSalt,
        role: role || 'user',
        plan: this.normalizePlan(plan),
        verified: verified === true ? true : false,
        email_verification_token: emailVerificationToken || null,
        email_verification_token_created_at: emailVerificationTokenCreatedAt || null,
        created_at: now,
        enrollment_date: now
      };
      users.push(user);
      return users;
    }).then(users => users[users.length - 1]);
  }

  // ─── PHASE 1 FIX: markUserVerified ──────────────────────────────────────────
  async markUserVerified(userId) {
    return this.lockedUpdate(this.usersFile, [], async (users) => {
      const idx = users.findIndex(u => String(u.id) === String(userId));
      if (idx === -1) throw new Error(`User not found: ${userId}`);
      users[idx].verified = true;
      users[idx].email_verification_token = null;
      users[idx].email_verification_token_created_at = null;
      users[idx].verified_at = new Date().toISOString();
      return users;
    });
  }

  // ─── PHASE 1 FIX: updateVerificationToken ───────────────────────────────────
  async updateVerificationToken(userId, newToken) {
    return this.lockedUpdate(this.usersFile, [], async (users) => {
      const idx = users.findIndex(u => String(u.id) === String(userId));
      if (idx === -1) throw new Error(`User not found: ${userId}`);
      users[idx].email_verification_token = newToken;
      users[idx].email_verification_token_created_at = Date.now();
      return users;
    });
  }

  async findUserByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return null;
    const users = await this.listUsers();
    return users.find(user => String(user.email || '').toLowerCase() === normalized) || null;
  }

  async findUserById(userId) {
    const users = await this.listUsers();
    return users.find(user => String(user.id) === String(userId)) || null;
  }

  // ─── PHASE 1 FIX: addInterview uses lockedUpdate ─────────────────────────────
  async addInterview(interview) {
    return this.lockedUpdate(this.interviewsFile, [], async (interviews) => {
      const saved = {
        id: crypto.randomUUID(),
        ...interview,
        created_at: new Date().toISOString()
      };
      interviews.push(saved);
      return interviews;
    }).then(interviews => interviews[interviews.length - 1]);
  }

  async listInterviews() {
    return this.readJson(this.interviewsFile, []);
  }

  async listInterviewsForUser({ userId, email }) {
    const interviews = await this.listInterviews();
    return interviews.filter(item => {
      if (userId && String(item.user_id) === String(userId)) return true;
      if (email && String(item.email || '').toLowerCase() === String(email).toLowerCase()) return true;
      return false;
    });
  }

  async listRefunds() {
    return this.readJson(this.refundsFile, []);
  }

  // ─── PHASE 1 FIX: addRefundRequest uses lockedUpdate ─────────────────────────
  async addRefundRequest(refund) {
    return this.lockedUpdate(this.refundsFile, [], async (refunds) => {
      const saved = {
        id: crypto.randomUUID(),
        status: 'REQUESTED',
        ...refund,
        created_at: new Date().toISOString()
      };
      refunds.push(saved);
      return refunds;
    }).then(refunds => refunds[refunds.length - 1]);
  }

  async getLatestRefundForUser({ userId, email }) {
    const refunds = await this.listRefunds();
    const filtered = refunds.filter(item => {
      if (userId && String(item.user_id) === String(userId)) return true;
      if (email && String(item.email || '').toLowerCase() === String(email).toLowerCase()) return true;
      return false;
    });

    filtered.sort((a, b) => {
      const aTs = Date.parse(a.created_at) || 0;
      const bTs = Date.parse(b.created_at) || 0;
      return bTs - aTs;
    });

    return filtered[0] || null;
  }
}

module.exports = LocalApiStore;
