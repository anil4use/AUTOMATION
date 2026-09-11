import { LocalStorageFileModel } from '@automation/database';

export class DataVaultAdapter {
  /**
   * Helper to convert array of objects to CSV string
   */
  private static convertToCsv(data: any, customHeaders?: string): { csvText: string; rowCount: number } {
    let rowsArr: any[] = [];
    if (Array.isArray(data)) {
      rowsArr = data;
    } else if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data.results)) rowsArr = data.results;
      else if (Array.isArray(data.data)) rowsArr = data.data;
      else if (Array.isArray(data.items)) rowsArr = data.items;
      else rowsArr = [data];
    } else {
      const textVal = String(data || '');
      return { csvText: `Value\n"${textVal.replace(/"/g, '""')}"`, rowCount: 1 };
    }

    if (rowsArr.length === 0) {
      return { csvText: 'No Data\n', rowCount: 0 };
    }

    let headers: string[] = [];
    if (customHeaders && customHeaders.trim()) {
      headers = customHeaders.split(',').map((h) => h.trim());
    } else {
      const keysSet = new Set<string>();
      rowsArr.forEach((row) => {
        if (typeof row === 'object' && row !== null) {
          Object.keys(row).forEach((k) => keysSet.add(k));
        }
      });
      headers = Array.from(keysSet);
      if (headers.length === 0) headers = ['Value'];
    }

    const lines: string[] = [headers.join(',')];
    rowsArr.forEach((row) => {
      if (typeof row === 'object' && row !== null) {
        const lineVals = headers.map((h) => {
          const val = row[h] !== undefined ? row[h] : '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        });
        lines.push(lineVals.join(','));
      } else {
        lines.push(`"${String(row).replace(/"/g, '""')}"`);
      }
    });

    return { csvText: lines.join('\n'), rowCount: rowsArr.length };
  }

  /**
   * Execute Action Strategy
   */
  static async executeAction(
    actionId: string,
    inputs: Record<string, any>,
    context: { organizationId: string; workflowId?: string; stepId?: string; executionId?: string }
  ) {
    const orgId = context.organizationId || 'default-org';
    const baseUrl = process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    if (actionId === 'save_document' || actionId === 'save_json' || actionId === 'save_text' || actionId === 'save_html') {
      const rawFileName = inputs.fileName || `document_${Date.now()}.${inputs.format || 'json'}`;
      const format = inputs.format || 'json';
      let contentStr = '';

      if (typeof inputs.content === 'object' && inputs.content !== null) {
        contentStr = JSON.stringify(inputs.content, null, 2);
      } else {
        contentStr = String(inputs.content || '');
      }

      const mimeType =
        format === 'csv'
          ? 'text/csv'
          : format === 'json'
          ? 'application/json'
          : format === 'html'
          ? 'text/html'
          : format === 'markdown'
          ? 'text/markdown'
          : 'text/plain';

      const fileDoc = await LocalStorageFileModel.create({
        organizationId: orgId,
        workflowId: context.workflowId,
        stepId: context.stepId,
        executionId: context.executionId,
        fileName: rawFileName.endsWith(`.${format}`) ? rawFileName : `${rawFileName}.${format}`,
        format,
        mimeType,
        sizeBytes: Buffer.byteLength(contentStr, 'utf8'),
        fileContent: contentStr,
        version: 'v1.0',
        metadata: { sourceAction: actionId },
      });

      const downloadUrl = `${baseUrl}/v1/storage/files/${fileDoc._id}/download`;

      return {
        success: true,
        fileId: String(fileDoc._id),
        fileName: fileDoc.fileName,
        format: fileDoc.format,
        sizeBytes: fileDoc.sizeBytes,
        downloadUrl,
        message: `Successfully saved ${fileDoc.fileName} into Data Vault persistent storage.`,
      };
    }

    if (actionId === 'append_csv_dataset' || actionId === 'append_csv') {
      const rawFileName = inputs.fileName || `dataset_${Date.now()}.csv`;
      const fileName = rawFileName.endsWith('.csv') ? rawFileName : `${rawFileName}.csv`;
      const { csvText, rowCount } = DataVaultAdapter.convertToCsv(inputs.rowData, inputs.headers);

      // Check if existing dataset file exists to append rows
      const existing = await LocalStorageFileModel.findOne({
        organizationId: orgId,
        fileName,
      });

      let finalContent = csvText;
      let totalRows = rowCount;

      if (existing) {
        const existingLines = existing.fileContent.split('\n');
        const newLines = csvText.split('\n').slice(1); // skip header line of new batch
        finalContent = `${existing.fileContent}\n${newLines.join('\n')}`;
        totalRows = (existing.metadata?.totalRows || existingLines.length - 1) + rowCount;

        existing.fileContent = finalContent;
        existing.sizeBytes = Buffer.byteLength(finalContent, 'utf8');
        existing.metadata = { ...existing.metadata, totalRows, lastAppendedAt: new Date() };
        await existing.save();

        const downloadUrl = `${baseUrl}/v1/storage/files/${existing._id}/download`;

        return {
          success: true,
          fileId: String(existing._id),
          fileName: existing.fileName,
          totalRows,
          appendedRows: rowCount,
          downloadUrl,
          message: `Appended ${rowCount} new rows to existing dataset ${existing.fileName}. Total rows: ${totalRows}.`,
        };
      }

      const fileDoc = await LocalStorageFileModel.create({
        organizationId: orgId,
        workflowId: context.workflowId,
        stepId: context.stepId,
        executionId: context.executionId,
        fileName,
        format: 'csv',
        mimeType: 'text/csv',
        sizeBytes: Buffer.byteLength(finalContent, 'utf8'),
        fileContent: finalContent,
        version: 'v1.0',
        metadata: { totalRows: rowCount, sourceAction: actionId },
      });

      const downloadUrl = `${baseUrl}/v1/storage/files/${fileDoc._id}/download`;

      return {
        success: true,
        fileId: String(fileDoc._id),
        fileName: fileDoc.fileName,
        totalRows: rowCount,
        appendedRows: rowCount,
        downloadUrl,
        message: `Created new dataset ${fileDoc.fileName} with ${rowCount} rows in Data Vault.`,
      };
    }

    if (actionId === 'create_version_snapshot') {
      const baseName = inputs.fileName || 'snapshot';
      const version = inputs.version || 'v1.0';
      const fileName = `${baseName}_${version}.json`;

      let contentStr = '';
      if (typeof inputs.content === 'object' && inputs.content !== null) {
        contentStr = JSON.stringify(inputs.content, null, 2);
      } else {
        contentStr = String(inputs.content || '');
      }

      const fileDoc = await LocalStorageFileModel.create({
        organizationId: orgId,
        workflowId: context.workflowId,
        stepId: context.stepId,
        executionId: context.executionId,
        fileName,
        format: 'json',
        mimeType: 'application/json',
        sizeBytes: Buffer.byteLength(contentStr, 'utf8'),
        fileContent: contentStr,
        version,
        metadata: { isSnapshot: true, versionTag: version },
      });

      const downloadUrl = `${baseUrl}/v1/storage/files/${fileDoc._id}/download`;

      return {
        success: true,
        fileId: String(fileDoc._id),
        fileName: fileDoc.fileName,
        version: fileDoc.version,
        downloadUrl,
        message: `Created version snapshot ${fileDoc.fileName} (${version}).`,
      };
    }

    if (actionId === 'query_dataset' || actionId === 'list_files') {
      const filter: any = { organizationId: orgId };
      if (inputs.searchQuery) {
        filter.fileName = { $regex: inputs.searchQuery, $options: 'i' };
      }
      if (inputs.format) {
        filter.format = inputs.format;
      }

      const files = await LocalStorageFileModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const formatted = files.map((f: any) => ({
        fileId: String(f._id),
        fileName: f.fileName,
        format: f.format,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        version: f.version,
        createdAt: f.createdAt,
        downloadUrl: `${baseUrl}/v1/storage/files/${f._id}/download`,
      }));

      return {
        success: true,
        files: formatted,
        totalCount: formatted.length,
      };
    }

    throw new Error(`Unsupported action '${actionId}' for Data Vault connector`);
  }
}
