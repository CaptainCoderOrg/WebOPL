/**
 * Logging utility with environment-aware output
 *
 * In development: All logs shown
 * In production: Only warnings and errors
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug information (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning messages (always shown)
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Error messages (always shown)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Group messages (only in development)
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * End group (only in development)
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Table output (only in development)
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};
