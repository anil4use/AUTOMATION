export const inMemoryLogs: Array<{ id: string; level: string; message: string; timestamp: string }> = [];

export const logger = {
  info: (msg: string, ...args: any[]) => {
    const entry = { id: `log_${Date.now()}`, level: 'info', message: String(msg), timestamp: new Date().toISOString() };
    inMemoryLogs.push(entry);
    console.log(`[INFO] ${entry.timestamp}: ${entry.message}`);
  },
  warn: (msg: string, ...args: any[]) => {
    const entry = { id: `log_${Date.now()}`, level: 'warn', message: String(msg), timestamp: new Date().toISOString() };
    inMemoryLogs.push(entry);
    console.warn(`[WARN] ${entry.timestamp}: ${entry.message}`);
  },
  error: (msg: string, ...args: any[]) => {
    const entry = { id: `log_${Date.now()}`, level: 'error', message: String(msg), timestamp: new Date().toISOString() };
    inMemoryLogs.push(entry);
    console.error(`[ERROR] ${entry.timestamp}: ${entry.message}`);
  },
  debug: (msg: string, ...args: any[]) => {
    const entry = { id: `log_${Date.now()}`, level: 'debug', message: String(msg), timestamp: new Date().toISOString() };
    inMemoryLogs.push(entry);
    console.debug(`[DEBUG] ${entry.timestamp}: ${entry.message}`);
  },
};
