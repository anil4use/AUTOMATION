import { UsageModel, OrganizationModel } from '@automation/database';
import { env } from '../../config/env';

export class BillingService {
  static async getOrgUsage(orgId: string) {
    const period = new Date().toISOString().slice(0, 7);
    let usage = await UsageModel.findOne({ organizationId: orgId, period });
    if (!usage) {
      usage = await UsageModel.create({
        organizationId: orgId,
        period,
        taskExecutions: 42,
        aiGenerations: 7,
        limitTaskExecutions: 1000,
        limitAiGenerations: 50,
      });
    }
    return usage;
  }

  static async createCheckoutSession(orgId: string, plan: 'pro' | 'enterprise') {
    // Return Stripe Test Mode Checkout URL
    const prices = {
      pro: 'price_pro_test_123',
      enterprise: 'price_ent_test_456',
    };

    return {
      url: `https://checkout.stripe.com/test/session_${Date.now()}?price=${prices[plan]}&org=${orgId}`,
    };
  }

  static async handleWebhook(event: { type: string; data: any }) {
    if (event.type === 'checkout.session.completed') {
      const orgId = event.data.object.client_reference_id;
      await OrganizationModel.findByIdAndUpdate(orgId, { plan: 'pro' });
    }
    return { received: true };
  }
}
