import { WorkflowDomainModel } from '@automation/domain';
import { eventBus } from '@automation/events';
import { createLogger } from '@automation/observability';

const logger = createLogger('CreateWorkflowUseCase');

export class CreateWorkflowUseCase {
  static async execute(params: {
    organizationId: string;
    creatorId: string;
    name: string;
    description?: string;
  }): Promise<WorkflowDomainModel> {
    logger.info(`Creating new workflow '${params.name}' for org ${params.organizationId}`);

    const workflow: WorkflowDomainModel = {
      id: `wf_${Date.now()}`,
      organizationId: params.organizationId,
      creatorId: params.creatorId,
      name: params.name,
      description: params.description,
      status: 'draft',
      version: 1,
      environment: 'dev',
      definition: { nodes: [], edges: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await eventBus.publish('WorkflowCreated', { workflowId: workflow.id, name: workflow.name });
    return workflow;
  }
}

export class PublishWorkflowUseCase {
  static async execute(workflow: WorkflowDomainModel): Promise<WorkflowDomainModel> {
    logger.info(`Publishing workflow '${workflow.name}' (id: ${workflow.id})`);
    workflow.status = 'active';
    workflow.version += 1;
    workflow.updatedAt = new Date();

    await eventBus.publish('WorkflowPublished', { workflowId: workflow.id, version: workflow.version });
    return workflow;
  }
}
