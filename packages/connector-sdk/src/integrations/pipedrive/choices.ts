import axios from 'axios';

export async function getPipedriveChoices(
  fieldId: string,
  credentials: Record<string, any>,
  dependsOnValues?: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.apiToken || credentials.apiKey || credentials.accessToken;
  if (!token) return [];

  try {
    if (fieldId === 'pipelineId') {
      const res = await axios.get(`https://api.pipedrive.com/v1/pipelines?api_token=${token}`);
      const pipelines = res.data?.data || [];
      return pipelines.map((p: any) => ({ label: p.name || `${p.id}`, value: `${p.id}` }));
    }

    if (fieldId === 'stageId') {
      const pipelineId = dependsOnValues?.pipelineId;
      const url = pipelineId
        ? `https://api.pipedrive.com/v1/stages?pipeline_id=${pipelineId}&api_token=${token}`
        : `https://api.pipedrive.com/v1/stages?api_token=${token}`;
      const res = await axios.get(url);
      const stages = res.data?.data || [];
      return stages.map((s: any) => ({ label: s.name || `${s.id}`, value: `${s.id}` }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
