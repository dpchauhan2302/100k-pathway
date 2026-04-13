const fs = require('fs').promises;
const path = require('path');

/**
 * File-based data storage
 * No database needed - stores as JSON files
 */
class FileStorage {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.applicationsDir = path.join(this.dataDir, 'applications');
    this.logsDir = path.join(this.dataDir, 'logs');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.applicationsDir, { recursive: true });
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      console.error('Storage init failed:', error);
    }
  }

  /**
   * Save application submission
   */
  async saveApplication(data) {
    try {
      const timestamp = Date.now();
      const filename = `app_${timestamp}_${this.sanitize(data.email)}.json`;
      const filepath = path.join(this.applicationsDir, filename);
      
      const record = {
        ...data,
        submittedAt: new Date().toISOString(),
        timestamp,
        id: timestamp.toString()
      };
      
      await fs.writeFile(filepath, JSON.stringify(record, null, 2));
      return { success: true, id: record.id, filepath };
    } catch (error) {
      await this.logError('saveApplication', error);
      throw error;
    }
  }

  /**
   * Get all applications
   */
  async getApplications(limit = 100) {
    try {
      const files = await fs.readdir(this.applicationsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      const applications = await Promise.all(
        jsonFiles.slice(-limit).map(async (file) => {
          const content = await fs.readFile(
            path.join(this.applicationsDir, file),
            'utf-8'
          );
          return JSON.parse(content);
        })
      );
      
      return applications.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      await this.logError('getApplications', error);
      return [];
    }
  }

  /**
   * Search applications by email
   */
  async findByEmail(email) {
    try {
      const applications = await this.getApplications();
      return applications.filter(app => 
        app.email.toLowerCase() === email.toLowerCase()
      );
    } catch (error) {
      await this.logError('findByEmail', error);
      return [];
    }
  }

  /**
   * Log errors to file
   */
  async logError(context, error) {
    try {
      const timestamp = new Date().toISOString();
      const logFile = path.join(
        this.logsDir,
        `error_${new Date().toISOString().split('T')[0]}.log`
      );
      
      const logEntry = `[${timestamp}] ${context}: ${error.message}\n${error.stack}\n\n`;
      
      await fs.appendFile(logFile, logEntry);
      
      // Also log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[${context}]`, error);
      }
    } catch (logError) {
      console.error('Logging failed:', logError);
    }
  }

  /**
   * Log general activity
   */
  async logActivity(action, data) {
    try {
      const timestamp = new Date().toISOString();
      const logFile = path.join(
        this.logsDir,
        `activity_${new Date().toISOString().split('T')[0]}.log`
      );
      
      const logEntry = `[${timestamp}] ${action}: ${JSON.stringify(data)}\n`;
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Activity logging failed:', error);
    }
  }

  /**
   * Get error logs for monitoring
   */
  async getRecentErrors(days = 7) {
    try {
      const files = await fs.readdir(this.logsDir);
      const errorFiles = files
        .filter(f => f.startsWith('error_') && f.endsWith('.log'))
        .slice(-days);
      
      const logs = await Promise.all(
        errorFiles.map(async (file) => {
          const content = await fs.readFile(
            path.join(this.logsDir, file),
            'utf-8'
          );
          return { file, content };
        })
      );
      
      return logs;
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return [];
    }
  }

  /**
   * Sanitize filename
   */
  sanitize(str) {
    return str.replace(/[^a-zA-Z0-9@._-]/g, '_').substring(0, 50);
  }

  /**
   * Get storage stats
   */
  async getStats() {
    try {
      const appFiles = await fs.readdir(this.applicationsDir);
      const logFiles = await fs.readdir(this.logsDir);
      
      return {
        totalApplications: appFiles.filter(f => f.endsWith('.json')).length,
        totalLogs: logFiles.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      await this.logError('getStats', error);
      return null;
    }
  }
}

module.exports = FileStorage;
