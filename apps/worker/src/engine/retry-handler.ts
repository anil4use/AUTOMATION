export class RetryHandler {
  static async executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, delays = [1000, 5000, 20000]): Promise<T> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt > maxRetries) throw err;
        const delay = delays[attempt - 1] || 60000;
        console.warn(`[Worker Engine] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Max retries reached');
  }
}
