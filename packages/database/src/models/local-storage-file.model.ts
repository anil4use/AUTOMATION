import mongoose, { Schema, model, Document } from 'mongoose';

export interface ILocalStorageFile extends Document {
  organizationId: string;
  workflowId?:     string;
  stepId?:         string;
  executionId?:    string;
  fileName:        string;
  format:          'csv' | 'json' | 'txt' | 'html' | 'markdown' | 'pdf' | 'binary' | string;
  mimeType:        string;
  sizeBytes:       number;
  fileContent:     string; // Base64 encoded buffer or string content stored in MongoDB Atlas
  storagePath?:    string;
  version?:        string;
  metadata?:       Record<string, any>;
  createdAt:       Date;
  updatedAt:       Date;
}

const LocalStorageFileSchema = new Schema<ILocalStorageFile>(
  {
    organizationId: { type: String, required: true, index: true },
    workflowId:     { type: String, index: true },
    stepId:         { type: String },
    executionId:    { type: String, index: true },
    fileName:       { type: String, required: true, index: true },
    format:         { type: String, required: true, default: 'json', index: true },
    mimeType:       { type: String, required: true, default: 'application/json' },
    sizeBytes:      { type: Number, default: 0 },
    fileContent:    { type: String, required: true },
    storagePath:    { type: String },
    version:        { type: String, default: 'v1.0' },
    metadata:       { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const LocalStorageFileModel =
  mongoose.models.LocalStorageFile ||
  model<ILocalStorageFile>(
    'LocalStorageFile',
    LocalStorageFileSchema,
    'local_storage_files'
  );

export const LocalStorageFilesModel = LocalStorageFileModel;
