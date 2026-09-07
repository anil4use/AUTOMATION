import axios from 'axios';

interface HubSpotCredentials {
  accessToken: string;
}

export async function registerHubSpotWebhook(
  credentials: HubSpotCredentials,
  appId: string,
  eventType: string = 'contact.creation'
): Promise<{ subscriptionId: string }> {
  const response = await axios.post(
    `https://api.hubapi.com/webhooks/v3/${appId}/subscriptions`,
    {
      eventType,
      active: true,
    },
    {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    }
  );

  return { subscriptionId: String(response.data.id) };
}

export async function deregisterHubSpotWebhook(
  credentials: HubSpotCredentials,
  appId: string,
  subscriptionId: string
): Promise<void> {
  await axios.delete(
    `https://api.hubapi.com/webhooks/v3/${appId}/subscriptions/${subscriptionId}`,
    {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    }
  );
}
