// Centralized Error Logging
// Log lỗi vào file và database

import fs from 'fs';
import path from 'path';
import { dbRun } from './database';

interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: any;
  user_id?: number;
  request_path?: string;
  request_method?: string;
}

class ErrorLogger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'error.log');
    this.ensureLogDir();
  }

  /**
   * Đảm bảo thư mục logs tồn tại
   */
  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log lỗi vào file
   */
  private logToFile(entry: ErrorLogEntry) {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine, 'utf-8');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  /**
   * Log lỗi vào database
   */
  private async logToDatabase(entry: ErrorLogEntry) {
    try {
      await dbRun(
        `INSERT INTO error_logs (timestamp, level, message, stack, context, user_id, request_path, request_method) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.timestamp,
          entry.level,
          entry.message,
          entry.stack || null,
          entry.context ? JSON.stringify(entry.context) : null,
          entry.user_id || null,
          entry.request_path || null,
          entry.request_method || null,
        ]
      );
    } catch (err) {
      console.error('Failed to write to database:', err);
    }
  }

  /**
   * Log một error
   */
  async error(
    message: string,
    options?: {
      error?: Error;
      context?: any;
      user_id?: number;
      request_path?: string;
      request_method?: string;
    }
  ) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      stack: options?.error?.stack,
      context: options?.context,
      user_id: options?.user_id,
      request_path: options?.request_path,
      request_method: options?.request_method,
    };

    console.error(`[ERROR] ${message}`, options?.error);
    this.logToFile(entry);
    await this.logToDatabase(entry);
  }

  /**
   * Log một warning
   */
  async warning(
    message: string,
    options?: {
      context?: any;
      user_id?: number;
    }
  ) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      context: options?.context,
      user_id: options?.user_id,
    };

    console.warn(`[WARNING] ${message}`);
    this.logToFile(entry);
    await this.logToDatabase(entry);
  }

  /**
   * Log một info
   */
  async info(
    message: string,
    options?: {
      context?: any;
      user_id?: number;
    }
  ) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context: options?.context,
      user_id: options?.user_id,
    };

    console.info(`[INFO] ${message}`);
    this.logToFile(entry);
    await this.logToDatabase(entry);
  }

  /**
   * Đọc logs từ file
   */
  readLogs(lines: number = 100): ErrorLogEntry[] {
    try {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const allLines = content.trim().split('\n');
      const lastLines = allLines.slice(-lines);

      return lastLines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ErrorLogEntry[];
    } catch (err) {
      console.error('Failed to read log file:', err);
      return [];
    }
  }

  /**
   * Xóa logs cũ (giữ lại N ngày gần nhất)
   */
  cleanup(daysToKeep: number = 30) {
    try {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const lines = content.trim().split('\n');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filteredLines = lines.filter((line) => {
        try {
          const entry = JSON.parse(line) as ErrorLogEntry;
          return new Date(entry.timestamp) > cutoffDate;
        } catch {
          return false;
        }
      });

      fs.writeFileSync(this.logFile, filteredLines.join('\n') + '\n', 'utf-8');
      console.warn(`Cleaned up logs older than ${daysToKeep} days`);
    } catch (err) {
      console.error('Failed to cleanup logs:', err);
    }
  }
}

// Singleton instance
export const logger = new ErrorLogger();

// Helper function để log uncaught exceptions
export function setupGlobalErrorHandlers() {
  if (typeof window !== 'undefined') {
    // Client-side error handler
    window.addEventListener('error', (event) => {
      logger.error('Uncaught error', {
        error: event.error,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection', {
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      });
    });
  } else {
    // Server-side error handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', {
        error: reason instanceof Error ? reason : new Error(String(reason)),
      });
    });
  }
}
