import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface HubSpotCredentials {
  accessToken: string;
}

export async function getHubSpotChoices(
  fieldId: string,
  credentials: HubSpotCredentials
): Promise<ChoiceOption[]> {
  const token = credentials?.accessToken;
  if (!token) return [];

  if (fieldId === 'pipelineId' || fieldId === 'dealStage') {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/pipelines/deals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pipelines = response.data.results || [];
      const choices: ChoiceOption[] = [];
      pipelines.forEach((p: any) => {
        (p.stages || []).forEach((s: any) => {
          choices.push({
            label: `${p.label} ➔ ${s.label}`,
            value: s.id,
            description: `Stage ID: ${s.id}`,
          });
        });
      });
      return choices;
    } catch {
      return [];
    }
  }

  return [];
}
