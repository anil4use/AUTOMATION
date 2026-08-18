import { WorkflowModel } from '@automation/database';

export class AIAgentRepository {
  static async saveDraft(workflowData: any) {
    return await WorkflowModel.create(workflowData);
  }
}
