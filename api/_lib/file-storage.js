const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// PHASE 2 FIX: Two correctness issues in the original FileStorage:
//
// 1. IDs were `Date.now().toString()` — two requests arriving within the same
//    millisecond (easily reproducible under any load) would produce the same ID
//    and filename, causing one application to silently overwrite the other.
//    Fixed: IDs are now crypto.randomUUID().
//
// 2. getRecentErrors() returned raw log file content to the caller, which
//    server.js then sent directly to the admin endpoint. Log files contain
//    full stack traces with internal file paths and library versions.
//    Fixed: returns structured summary objects, not raw text.

class FileStorage {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.applicationsDir = path.join(this.dataDir, 'applications');
    this.logsDir = path.join(this.dataDir, 'logs');
    // Don't call async init() from constructor — callers use ensureReady().
    this._readyPromise = null;
  }

  async ensureReady() {
    if (!this._readyPromise) {
      this._readyPromise = this._init();
    }
    return this._readyPromise;
  }

  async _init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.applicationsDir, { recursive: true });
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      console.error('Storage init failed:', error);
      throw error;
    }
  }

  // Save a new application submission.
  async saveApplication(data) {
    await this.ensureReady();
    try {
      // PHASE 2 FIX: UUID instead of timestamp — collision-safe.
      const id = crypto.randomUUID();
      const safeEmail = this._sanitizeFilename(data.email || 'unknown');
      const filename = `app_${id}_${safeEmail}.json`;
      const filepath = path.join(this.applicationsDir, filename);

      const record = {
        ...data,
        id,
        submittedAt: new Date().toISOString()
      };

      await fs.writeFile(filepath, JSON.stringify(record, null, 2), 'utf8');
      return { success: true, id, filepath };
    } catch (error) {
      await this.logError('saveApplication', error);
      throw error;
    }
  }

  // Return all application records, newest first.
  async getApplications(limit = 100) {
    await this.ensureReady();
    try {
      const files = await fs.readdir(this.applicationsDir);
      const jsonFiles = files
        .filter(f => f.endsWith('.json'))
        .slice(-limit);

      const applications = await Promise.all(
        jsonFiles.map(async file => {
          try {
            const content = await fs.readFile(
              path.join(this.applicationsDir, file), 'utf8'
            );
            return JSON.parse(content);
          } catch {
            return null; // Skip corrupt files
          }
        })
      );

      return applications
        .filter(Boolean)
        .sort((a, b) => {
          const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return bt - at;
        });
    } catch (error) {
      await this.logError('getApplications', error);
      return [];
    }
  }

  // Find all applications from a given email address.
  async findByEmail(email) {
    try {
      const applications = await this.getApplications();
      return applications.filter(app =>
        String(app.email || '').toLowerCase() === String(email || '').toLowerCase()
      );
    } catch (error) {
      await this.logError('findByEmail', error);
      return [];
    }
  }

  // Append an error entry to today's error log file.
  async logError(context, error) {
    try {
      await this.ensureReady();
      const timestamp = new Date().toISOString();
      const day = timestamp.split('T')[0];
      const logFile = path.join(this.logsDir, `error_${day}.log`);

      const logEntry = `[${timestamp}] ${context}: ${error.message}\n${error.stack || ''}\n\n`;
      await fs.appendFile(logFile, logEntry, 'utf8');

      if (process.env.NODE_ENV !== 'production') {
        console.error(`[${context}]`, error);
      }
    } catch (logError) {
      // Last-resort console — never throw from a logging function.
      console.error('Logging failed:', logError);
    }
  }

  // Append a structured activity entry to today's activity log.
  async logActivity(action, data) {
    try {
      await this.ensureReady();
      const timestamp = new Date().toISOString();
      const day = timestamp.split('T')[0];
      const logFile = path.join(this.logsDir, `activity_${day}.log`);
      const logEntry = `[${timestamp}] ${action}: ${JSON.stringify(data)}\n`;
      await fs.appendFile(logFile, logEntry, 'utf8');
    } catch (error) {
      console.error('Activity logging failed:', error);
    }
  }

  // Return structured summaries of recent error log files.
  // PHASE 2 FIX: Old version returned raw log text (full stack traces, file paths).
  // Now returns metadata only — line count and size. Admin can pull specific
  // log files through a secure admin-only file-download endpoint if needed.
  async getRecentErrors(days = 7) {
    await this.ensureReady();
    try {
      const files = await fs.readdir(this.logsDir);
      const errorFiles = files
        .filter(f => f.startsWith('error_') && f.endsWith('.log'))
        .slice(-days);

      const summaries = await Promise.all(
        errorFiles.map(async file => {
          try {
            const filePath = path.join(this.logsDir, file);
            const stat = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf8');
            const errorCount = (content.match(/^\[/gm) || []).length;
            return {
              date: file.replace('error_', '').replace('.log', ''),
              errorCount,
              sizeBytes: stat.size,
              lastModified: stat.mtime.toISOString()
            };
          } catch {
            return null;
          }
        })
      );

      return summaries.filter(Boolean);
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return [];
    }
  }

  // Return high-level storage counts for the admin dashboard.
  async getStats() {
    await this.ensureReady();
    try {
      const appFiles = await fs.readdir(this.applicationsDir);
      const logFiles = await fs.readdir(this.logsDir);
      return {
        totalApplications: appFiles.filter(f => f.endsWith('.json')).length,
        totalLogFiles: logFiles.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      await this.logError('getStats', error);
      return null;
    }
  }

  // Strip characters that are unsafe in file names.
  _sanitizeFilename(str) {
    return String(str)
      .replace(/[^a-zA-Z0-9@._-]/g, '_')
      .substring(0, 50);
  }
}

module.exports = FileStorage;
