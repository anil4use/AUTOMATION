export async function getGoogleGeminiChoices(
  fieldId: string,
  _credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  if (fieldId === 'model') {
    return [
      { label: 'Gemini 1.5 Pro (Best for complex reasoning)', value: 'gemini-1.5-pro' },
      { label: 'Gemini 1.5 Flash (Fastest & high volume)', value: 'gemini-1.5-flash' },
      { label: 'Gemini 1.0 Pro', value: 'gemini-pro' },
    ];
  }
  return [];
}
