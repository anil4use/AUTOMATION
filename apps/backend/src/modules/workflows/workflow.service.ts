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

  static async updateWorkflow(id: string, orgId: string, creatorId: string, input: UpdateWorkflowDTO) {
    let workflow = null;
    if (id && id !== 'new' && id !== 'draft' && id.length === 24) {
      try {
        workflow = await WorkflowRepository.update(id, orgId, input);
      } catch {}
    }

    if (!workflow) {
      // Auto-upsert workflow into MongoDB Atlas if ID is new or missing
      workflow = await WorkflowRepository.create({
        organizationId: orgId,
        creatorId: creatorId || orgId,
        name: input.name || `Workflow_${Date.now().toString().slice(-4)}`,
        description: input.description || 'Automated workflow pipeline.',
        status: input.status || 'active',
        definition: input.definition || { nodes: [], edges: [] },
      });
    }

    return workflow;
  }

  static async deleteWorkflow(id: string, orgId: string) {
    const result = await WorkflowRepository.delete(id, orgId);
    if (result.deletedCount === 0) throw new AppError('Workflow not found', 404);
    return true;
  }
}
