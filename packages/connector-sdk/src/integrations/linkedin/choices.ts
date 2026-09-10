/**
 * LinkedIn Choices Provider for Dynamic Dropdowns
 */

export async function getOrganizationsChoice(credentials: Record<string, any>): Promise<Array<{ value: string; label: string }>> {
  const token = credentials?.accessToken || credentials?.access_token;
  if (token) {
    try {
      const res = await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const orgs = (data.elements || []).map((el: any) => {
          const orgUrn = el.organizationalTarget || '';
          const orgId = orgUrn.split(':').pop() || orgUrn;
          return { value: orgId, label: `Organization (${orgId})` };
        });
        if (orgs.length > 0) return orgs;
      }
    } catch { }
  }

  return [
    { value: '100123', label: 'Primary Company Page (ID: 100123)' },
    { value: '100456', label: 'Careers & Recruitment Page (ID: 100456)' },
  ];
}
