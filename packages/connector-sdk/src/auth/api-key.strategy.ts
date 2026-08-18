export class ApiKeyStrategy {
  static validateApiKey(apiKey: string): boolean {
    return Boolean(apiKey && apiKey.trim().length >= 8);
  }

  static getAuthHeaders(apiKey: string, headerName = 'Authorization', prefix = 'Bearer '): Record<string, string> {
    return {
      [headerName]: `${prefix}${apiKey}`,
    };
  }
}
