import { WorkflowRepository } from './workflow.repository';
import { CreateWorkflowDTO, UpdateWorkflowDTO } from './workflow.types';
import { AppError } from '../../shared/errors/app.error';

export class WorkflowService {
  static async createWorkflow(orgId: string, creatorId: string, input: CreateWorkflowDTO) {
    return await WorkflowRepository.create({
      organizationId: orgId,
      creatorId,
      name: input.name,
      description: input.description,
      status: 'draft',
      definition: input.definition || { nodes: [], edges: [] },
    });
  }

  static async getWorkflows(orgId: string) {
    return await WorkflowRepository.findByOrg(orgId);
  }

  static async getWorkflowById(id: string, orgId: string) {
    const workflow = await WorkflowRepository.findById(id, orgId);
    if (!workflow) throw new AppError('Workflow not found', 404);
    return workflow;
  }

  static async updateWorkflow(id: string, orgId: string, input: UpdateWorkflowDTO) {
    const workflow = await WorkflowRepository.update(id, orgId, input);
    if (!workflow) throw new AppError('Workflow not found', 404);
    return workflow;
  }

  static async deleteWorkflow(id: string, orgId: string) {
    const result = await WorkflowRepository.delete(id, orgId);
    if (result.deletedCount === 0) throw new AppError('Workflow not found', 404);
    return true;
  }
}
