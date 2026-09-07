import axios from 'axios';

interface JiraCredentials {
  apiToken: string;
  email: string;
  domain: string;
}

/**
 * Registers a Jira webhook (expires after 30 days per Jira API)
 */
export async function registerJiraWebhook(
  credentials: JiraCredentials,
  webhookUrl: string,
  events: string[] = ['jira:issue_created', 'jira:issue_updated'],
  projectKey?: string
): Promise<{ webhookId: string; expiresAt: Date }> {
  const { apiToken, email, domain } = credentials;
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const baseURL = `https://${domain}.atlassian.net/rest/api/3`;

  const body: any = {
    url: webhookUrl,
    webhooks: [
      {
        events,
        jqlFilter: projectKey ? `project = ${projectKey}` : undefined,
      },
    ],
  };

  const response = await axios.post(`${baseURL}/webhook`, body, {
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
  });

  const createdId = response.data.webhookRegistrationResult?.[0]?.createdWebhookId;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return {
    webhookId: String(createdId),
    expiresAt,
  };
}

export async function refreshJiraWebhook(
  credentials: JiraCredentials,
  webhookId: string
): Promise<{ expiresAt: Date }> {
  const { apiToken, email, domain } = credentials;
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const baseURL = `https://${domain}.atlassian.net/rest/api/3`;

  const newExpiration = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await axios.put(
    `${baseURL}/webhook/refresh`,
    { webhookIds: [Number(webhookId)] },
    { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } }
  );

  return { expiresAt: new Date(newExpiration) };
}
