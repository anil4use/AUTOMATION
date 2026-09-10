export interface LeverWebhookPayload {
  event: string;
  data: Record<string, any>;
  token: string;
}

/**
 * Verify Lever ATS webhook security token header/body match.
 */
export function verifyLeverWebhookToken(
  receivedToken: string | undefined,
  configuredSecret: string
): boolean {
  if (!receivedToken || !configuredSecret) return false;
  return receivedToken === configuredSecret;
}
