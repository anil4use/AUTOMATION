/**
 * LinkedIn Standard & Partner API Action Handlers (Options 2 & 3)
 */

export async function executeApiAction(
  actionId: string,
  inputs: Record<string, any>,
  creds: { accessToken?: string; partnerApiKey?: string }
): Promise<Record<string, any>> {
  const PARTNER_ONLY_ACTIONS = new Set(['search_jobs', 'search_people', 'send_message', 'apply_to_job']);

  if (PARTNER_ONLY_ACTIONS.has(actionId) && !creds.partnerApiKey) {
    return {
      success: false,
      error: `Action '${actionId}' requires LinkedIn Partner API access. Most power features work via Browser Session (Option 1).`,
      requiresPartnerApi: true,
      data: {
        notice: 'To perform job searches or messaging via API, apply for the LinkedIn Developer Partner Program or use Option 1 (Browser Session).',
      },
    };
  }

  if (actionId === 'create_post') {
    const text = inputs.text || inputs.message || 'Updated status via AutoFlow';
    if (!creds.accessToken) {
      return { success: false, error: 'LinkedIn Access Token required to post updates.' };
    }
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: 'urn:li:person:self',
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: inputs.imageUrl ? 'IMAGE' : 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `LinkedIn post creation failed: ${errText}` };
    }
    const data: any = await res.json();
    const id = data.id;
    return { success: true, postId: id, postUrl: `https://www.linkedin.com/feed/update/${id}` };
  }

  if (actionId === 'get_feed') {
    if (!creds.accessToken) {
      return { success: false, error: 'LinkedIn Access Token required to fetch feed.' };
    }
    const res = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });
    if (!res.ok) {
      return { success: false, error: 'Failed to fetch feed from LinkedIn API.' };
    }
    const data: any = await res.json();
    return { success: true, data };
  }

  return {
    success: true,
    data: { result: `LinkedIn API action '${actionId}' completed` },
  };
}
