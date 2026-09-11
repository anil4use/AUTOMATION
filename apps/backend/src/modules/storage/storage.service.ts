import { LocalStorageFileModel } from '@automation/database';

export class StorageService {
  /**
   * List saved vault files for organization with format & search filters
   */
  static async listFiles(orgId: string, options: { search?: string; format?: string; limit?: number; offset?: number }) {
    const filter: any = { organizationId: orgId };

    if (options.search) {
      filter.$or = [
        { fileName: { $regex: options.search, $options: 'i' } },
        { format: { $regex: options.search, $options: 'i' } },
        { version: { $regex: options.search, $options: 'i' } },
      ];
    }

    if (options.format && options.format !== 'all') {
      filter.format = options.format;
    }

    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const [files, totalCount] = await Promise.all([
      LocalStorageFileModel.find(filter)
        .select('-fileContent') // Exclude heavy raw buffer payload from list view for maximum speed
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      LocalStorageFileModel.countDocuments(filter),
    ]);

    // Compute stats
    const statsResult = await LocalStorageFileModel.aggregate([
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSizeBytes: { $sum: '$sizeBytes' },
          csvCount: { $sum: { $cond: [{ $eq: ['$format', 'csv'] }, 1, 0] } },
          jsonCount: { $sum: { $cond: [{ $eq: ['$format', 'json'] }, 1, 0] } },
          htmlCount: { $sum: { $cond: [{ $eq: ['$format', 'html'] }, 1, 0] } },
          txtCount: { $sum: { $cond: [{ $eq: ['$format', 'txt'] }, 1, 0] } },
        },
      },
    ]);

    const stats = statsResult[0] || {
      totalFiles: 0,
      totalSizeBytes: 0,
      csvCount: 0,
      jsonCount: 0,
      htmlCount: 0,
      txtCount: 0,
    };

    return {
      files,
      totalCount,
      limit,
      offset,
      stats,
    };
  }

  /**
   * Fetch single file by ID for download/preview
   */
  static async getFileById(fileId: string, orgId: string) {
    const file = (await LocalStorageFileModel.findOne({ _id: fileId, organizationId: orgId }).lean()) as any;
    if (!file) {
      throw new Error(`Storage file '${fileId}' not found or access denied.`);
    }
    return file;
  }

  /**
   * Delete file by ID
   */
  static async deleteFile(fileId: string, orgId: string) {
    const deleted = await LocalStorageFileModel.findOneAndDelete({ _id: fileId, organizationId: orgId });
    if (!deleted) {
      throw new Error(`Storage file '${fileId}' not found.`);
    }
    return true;
  }
}
