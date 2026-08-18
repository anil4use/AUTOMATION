import { Router, Request, Response } from 'express';

const router = Router();

router.get('/stats', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      activeWorkflows: 14,
      totalExecutions: 1420,
      successRate: '99.4%',
      failedJobs: 8,
      recentWorkflows: [
        {
          id: 'wf_101',
          name: 'Gmail Attachment → Google Drive → Google Sheets → Slack Alert',
          status: 'Active',
          trigger: 'Gmail',
          action: 'Slack',
          connectors: ['Gmail', 'Google Drive', 'Google Sheets', 'Slack'],
          lastRun: '2 mins ago',
          runsCount: 142,
        },
        {
          id: 'wf_102',
          name: 'Stripe Payment Succeeded → Notion DB Page → WhatsApp Contact',
          status: 'Active',
          trigger: 'Stripe',
          action: 'WhatsApp',
          connectors: ['Stripe', 'Notion', 'WhatsApp'],
          lastRun: '15 mins ago',
          runsCount: 89,
        },
        {
          id: 'wf_103',
          name: 'WhatsApp Lead → AI Summarizer Node → Google Sheets Row',
          status: 'Active',
          trigger: 'WhatsApp',
          action: 'Google Sheets',
          connectors: ['WhatsApp', 'AI Node', 'Google Sheets'],
          lastRun: '1 hour ago',
          runsCount: 230,
        },
      ],
      recentExecutions: [
        { id: 'run_9402', workflow: 'Gmail to Slack Notifications', status: 'completed', duration: '0.4s', timestamp: 'Just now' },
        { id: 'run_9401', workflow: 'Gmail to Slack Notifications', status: 'completed', duration: '1.2s', timestamp: '2 mins ago' },
        { id: 'run_9400', workflow: 'Sheet Row AI Extractor', status: 'completed', duration: '3.4s', timestamp: '15 mins ago' },
      ],
    },
  });
});

export default router;
