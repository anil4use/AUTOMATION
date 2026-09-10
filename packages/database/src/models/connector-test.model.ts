import { Schema, model, Document } from 'mongoose';

export interface IConnectorTestDefinition extends Document {
  testId: string;
  connectorId: string;
  name: string;
  actionId: string;
  sampleInput: Record<string, any>;
  expectedOutputKeys: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorTestDefinitionSchema = new Schema<IConnectorTestDefinition>(
  {
    testId: { type: String, required: true, unique: true, index: true },
    connectorId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    actionId: { type: String, required: true },
    sampleInput: { type: Schema.Types.Mixed, default: {} },
    expectedOutputKeys: [{ type: String }],
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ConnectorTestDefinitionModel = model<IConnectorTestDefinition>(
  'ConnectorTestDefinition',
  ConnectorTestDefinitionSchema,
  'connector_test_definitions'
);
