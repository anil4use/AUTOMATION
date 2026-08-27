export type AuthType = 'oauth2' | 'api_key' | 'webhook' | 'basic' | 'none';

export interface ConnectorFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'array';
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  description?: string;
  placeholder?: string;
}

export interface ConnectorOperation {
  id: string;
  name: string;
  description: string;
  type: 'trigger' | 'action';
  inputs: ConnectorFieldSchema[];
  outputs: ConnectorFieldSchema[];
}

export interface WizardStepMetadata {
  id: 'setup' | 'configure' | 'test';
  label: string;
  subtitle?: string;
  description?: string;
}

export interface ConnectorWizardMetadata {
  step1: WizardStepMetadata;
  step2: WizardStepMetadata;
  step3: WizardStepMetadata;
}

export interface ConnectorManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string; // SVG or image URL
  authType: AuthType;
  authConfig?: Record<string, any>;
  triggers: ConnectorOperation[];
  actions: ConnectorOperation[];
  wizardMetadata?: ConnectorWizardMetadata;
}
