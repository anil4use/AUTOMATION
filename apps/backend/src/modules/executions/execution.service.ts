import { ExecutionRepository } from './execution.repository';
import { AppError } from '../../shared/errors/app.error';

export class ExecutionService {
  static async getLogs(orgId: string, filter?: any) {
    return await ExecutionRepository.findByOrg(orgId, filter);
  }

  static async getLogById(id: string, orgId: string) {
    const log = await ExecutionRepository.findById(id, orgId);
    if (!log) throw new AppError('Execution log not found', 404);
    return log;
  }
}
