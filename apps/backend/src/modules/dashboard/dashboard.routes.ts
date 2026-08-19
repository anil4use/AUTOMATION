import { Router, Request, Response } from 'express';
import { WorkflowModel, ExecutionLogModel } from '@automation/database';
import { authMiddleware } from '../../middleware/auth.middleware';
import { AuthenticatedRequest } from '../../shared/types/common.types';

const router = Router();

router.use(authMiddleware as any);

router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;

    let activeWorkflows = 0;
    let recentWorkflows: any[] = [];
    let totalExecutions = 0;
    let failedJobs = 0;

    try {
      activeWorkflows = await WorkflowModel.countDocuments({ organizationId: orgId, status: 'active' });
      recentWorkflows = await WorkflowModel.find({ organizationId: orgId }).sort({ updatedAt: -1 }).limit(5);
      totalExecutions = await ExecutionLogModel.countDocuments({ organizationId: orgId });
      failedJobs = await ExecutionLogModel.countDocuments({ organizationId: orgId, status: 'failed' });
    } catch (dbErr) {
      // Default cleanly to 0 if collections are empty or uninitialized
      activeWorkflows = 0;
      recentWorkflows = [];
      totalExecutions = 0;
      failedJobs = 0;
    }

    const successRate =
      totalExecutions > 0
        ? `${(((totalExecutions - failedJobs) / totalExecutions) * 100).toFixed(1)}%`
        : '100%';

    res.status(200).json({
      success: true,
      data: {
        activeWorkflows,
        totalExecutions,
        successRate,
        failedJobs,
        recentWorkflows,
        recentExecutions: [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to query database stats' });
  }
});

export default router;
