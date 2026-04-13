const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class LocalApiStore {
  constructor(rootDir = path.join(process.cwd(), 'data')) {
    this.rootDir = rootDir;
    this.usersFile = path.join(rootDir, 'users.json');
    this.interviewsFile = path.join(rootDir, 'interviews.json');
    this.refundsFile = path.join(rootDir, 'refunds.json');
    this.applicationsDir = path.join(rootDir, 'applications');
    this._readyPromise = null;
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
      if (error.code === 'ENOENT') {
        return fallback;
      }
      throw error;
    }
  }

  async writeJson(filePath, value) {
    await this.ensureReady();
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
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
    const files = entries.filter((file) => file.endsWith('.json'));

    const parsed = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(this.applicationsDir, file);
        try {
          const raw = await fs.readFile(filePath, 'utf8');
          const record = JSON.parse(raw);
          return {
            filePath,
            raw: record,
            mapped: this.mapApplicationRecord(record)
          };
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
    return records.map((entry) => entry.mapped);
  }

  async getApplicationById(id) {
    const records = await this.readApplicationRecordsWithFiles();
    const target = records.find((entry) => String(entry.mapped.id) === String(id));
    return target ? target.mapped : null;
  }

  async updateApplicationStatus(id, status, notes, updatedBy) {
    const records = await this.readApplicationRecordsWithFiles();
    const target = records.find((entry) => String(entry.mapped.id) === String(id));
    if (!target) {
      return null;
    }

    const normalizedStatus = String(status || 'PENDING').toUpperCase();
    target.raw.status = normalizedStatus;
    target.raw.notes = notes || target.raw.notes || '';
    target.raw.updatedAt = new Date().toISOString();
    target.raw.updatedBy = updatedBy || target.raw.updatedBy || 'system';

    await fs.writeFile(target.filePath, JSON.stringify(target.raw, null, 2), 'utf8');
    return this.mapApplicationRecord(target.raw);
  }

  async listUsers() {
    return this.readJson(this.usersFile, []);
  }

  async saveUsers(users) {
    return this.writeJson(this.usersFile, users);
  }

  async findUserByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return null;
    const users = await this.listUsers();
    return users.find((user) => String(user.email || '').toLowerCase() === normalized) || null;
  }

  async findUserById(userId) {
    const users = await this.listUsers();
    return users.find((user) => String(user.id) === String(userId)) || null;
  }

  async createUser({ fullName, email, passwordHash, passwordSalt, role, plan }) {
    const users = await this.listUsers();
    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      full_name: fullName,
      email: String(email || '').trim().toLowerCase(),
      password_hash: passwordHash,
      password_salt: passwordSalt,
      role: role || 'user',
      plan: this.normalizePlan(plan),
      verified: true,
      created_at: now,
      enrollment_date: now
    };
    users.push(user);
    await this.saveUsers(users);
    return user;
  }

  async listInterviews() {
    return this.readJson(this.interviewsFile, []);
  }

  async addInterview(interview) {
    const interviews = await this.listInterviews();
    const saved = {
      id: crypto.randomUUID(),
      ...interview,
      created_at: new Date().toISOString()
    };
    interviews.push(saved);
    await this.writeJson(this.interviewsFile, interviews);
    return saved;
  }

  async listInterviewsForUser({ userId, email }) {
    const interviews = await this.listInterviews();
    return interviews.filter((item) => {
      if (userId && String(item.user_id) === String(userId)) return true;
      if (email && String(item.email || '').toLowerCase() === String(email).toLowerCase()) return true;
      return false;
    });
  }

  async listRefunds() {
    return this.readJson(this.refundsFile, []);
  }

  async addRefundRequest(refund) {
    const refunds = await this.listRefunds();
    const saved = {
      id: crypto.randomUUID(),
      status: 'REQUESTED',
      ...refund,
      created_at: new Date().toISOString()
    };
    refunds.push(saved);
    await this.writeJson(this.refundsFile, refunds);
    return saved;
  }

  async getLatestRefundForUser({ userId, email }) {
    const refunds = await this.listRefunds();
    const filtered = refunds.filter((item) => {
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
