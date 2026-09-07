import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getGoogleGeminiChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const googleGeminiManifest: ConnectorManifest = {
  id: 'google-gemini',
  name: 'Google Gemini AI',
  description: 'Full-power Google Gemini AI integration — Generate text, analyze multimodal images/documents, output structured JSON & generate embeddings via Google AI Studio.',
  category: 'AI & Machine Learning',
  icon: '/icons/gemini.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'generate_text',
      name: 'Generate Text Content',
      description: 'Generates text response using Google Gemini 1.5 Pro/Flash.',
      type: 'action',
      inputs: [
        { key: 'model', label: 'Gemini Model', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'model' } },
        { key: 'prompt', label: 'User Prompt', type: 'string', required: true },
        { key: 'systemInstruction', label: 'System Persona Instruction', type: 'string', required: false },
        { key: 'temperature', label: 'Temperature (0.0 to 1.0)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'text', label: 'Generated Output Text', type: 'string', required: true },
        { key: 'finishReason', label: 'Finish Reason', type: 'string', required: true },
      ],
    },
    {
      id: 'analyze_image',
      name: 'Analyze Multimodal Image',
      description: 'Understands image content using Gemini Vision capabilities.',
      type: 'action',
      inputs: [
        { key: 'model', label: 'Model (Default: gemini-1.5-flash)', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'model' } },
        { key: 'prompt', label: 'Question or Prompt about Image', type: 'string', required: true },
        { key: 'image_base64', label: 'Image Base64 or Public Image URL', type: 'string', required: true },
        { key: 'mime_type', label: 'MIME Type (image/png, image/jpeg)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'text', label: 'Analysis Summary Output', type: 'string', required: true },
      ],
    },
  ],
};

export class GoogleGeminiConnector extends BaseConnector {
  manifest = googleGeminiManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const apiKey = credentials.apiKey || credentials.accessToken;

    if (!apiKey) {
      return { success: false, data: {}, error: 'Missing Google Gemini API key.' };
    }

    try {
      if (actionId === 'generate_text') {
        const model = inputs.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const body: any = {
          contents: [{ role: 'user', parts: [{ text: inputs.prompt }] }],
        };
        if (inputs.systemInstruction) {
          body.systemInstruction = { parts: [{ text: inputs.systemInstruction }] };
        }
        if (inputs.temperature !== undefined) {
          body.generationConfig = { temperature: Number(inputs.temperature) };
        }
        const res = await axios.post(url, body);
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const finishReason = res.data?.candidates?.[0]?.finishReason || 'STOP';
        return { success: true, data: { text, finishReason } };
      }

      if (actionId === 'analyze_image') {
        const model = inputs.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        let base64Data = inputs.image_base64;
        if (base64Data.startsWith('http')) {
          const imgRes = await axios.get(base64Data, { responseType: 'arraybuffer' });
          base64Data = Buffer.from(imgRes.data).toString('base64');
        }
        const body = {
          contents: [
            {
              parts: [
                { text: inputs.prompt },
                { inlineData: { mimeType: inputs.mime_type || 'image/jpeg', data: base64Data } },
              ],
            },
          ],
        };
        const res = await axios.post(url, body);
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { success: true, data: { text } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getGoogleGeminiChoices(fieldId, credentials);
  }
}

manifestRegistry.register(googleGeminiManifest);
