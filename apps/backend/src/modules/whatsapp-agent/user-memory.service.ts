import { Types } from 'mongoose';
import { UserMemoryModel, IUserMemory, IMemoryFact } from '@automation/database';
import { logger } from '../../config/logger';
import { ExtractedMemoryFact } from './whatsapp-agent.types';

export class UserMemoryService {
  /**
   * Get (or initialize) the memory record for a user in an automation.
   */
  static async getUserMemory(
    orgId: string,
    automationId: string,
    externalUserId: string,
    channel: string
  ): Promise<IUserMemory> {
    const filter = {
      organizationId: new Types.ObjectId(orgId),
      automationId: new Types.ObjectId(automationId),
      externalUserId,
    };

    let memory = await UserMemoryModel.findOne(filter);

    if (!memory) {
      memory = await UserMemoryModel.create({
        ...filter,
        channel,
        profile: {},
        facts: [],
        totalConversations: 0,
        lastSeenAt: new Date(),
      });
    }

    return memory;
  }

  /**
   * Update structured profile fields for a user (name, timezone, language, etc.)
   */
  static async updateProfile(
    orgId: string,
    automationId: string,
    externalUserId: string,
    channel: string,
    profileUpdates: Record<string, any>
  ): Promise<void> {
    const setObj: Record<string, any> = {
      lastSeenAt: new Date(),
    };

    for (const [key, value] of Object.entries(profileUpdates)) {
      setObj[`profile.${key}`] = value;
    }

    await UserMemoryModel.findOneAndUpdate(
      {
        organizationId: new Types.ObjectId(orgId),
        automationId: new Types.ObjectId(automationId),
        externalUserId,
      },
      { $set: setObj },
      { upsert: true, new: true }
    );
  }

  /**
   * Upsert a single memory fact for a user.
   * If the key already exists, updates the value and confidence.
   * If new, pushes a new fact entry.
   */
  static async upsertMemoryFact(
    orgId: string,
    automationId: string,
    externalUserId: string,
    channel: string,
    fact: ExtractedMemoryFact
  ): Promise<void> {
    const filter = {
      organizationId: new Types.ObjectId(orgId),
      automationId: new Types.ObjectId(automationId),
      externalUserId,
    };

    // Try to update an existing fact with this key
    const updateResult = await UserMemoryModel.updateOne(
      { ...filter, 'facts.key': fact.key },
      {
        $set: {
          'facts.$.value': fact.value,
          'facts.$.confidence': fact.confidence,
          'facts.$.updatedAt': new Date(),
          lastSeenAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      // Key doesn't exist yet — push a new fact
      await UserMemoryModel.updateOne(
        filter,
        {
          $push: {
            facts: {
              key: fact.key,
              value: fact.value,
              confidence: fact.confidence,
              source: 'extracted',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          $set: { lastSeenAt: new Date() },
        },
        { upsert: true }
      );
    }
  }

  /**
   * Bulk upsert multiple extracted memory facts after a conversation turn.
   */
  static async bulkUpsertFacts(
    orgId: string,
    automationId: string,
    externalUserId: string,
    channel: string,
    facts: ExtractedMemoryFact[]
  ): Promise<void> {
    for (const fact of facts) {
      try {
        await UserMemoryService.upsertMemoryFact(
          orgId,
          automationId,
          externalUserId,
          channel,
          fact
        );
      } catch (err) {
        logger.warn(
          `[UserMemoryService] Failed to upsert fact "${fact.key}" for user ${externalUserId}:`,
          err
        );
      }
    }
  }

  /**
   * Increment conversation count and update lastSeenAt for a user.
   */
  static async touchUserActivity(
    orgId: string,
    automationId: string,
    externalUserId: string,
    channel: string
  ): Promise<void> {
    await UserMemoryModel.findOneAndUpdate(
      {
        organizationId: new Types.ObjectId(orgId),
        automationId: new Types.ObjectId(automationId),
        externalUserId,
      },
      {
        $set: { lastSeenAt: new Date(), channel },
        $inc: { totalConversations: 1 },
      },
      { upsert: true }
    );
  }

  /**
   * Format the user's memory into a structured text block for LLM context injection.
   * Returns a ready-to-use string for inclusion in the agent system prompt.
   */
  static buildMemoryContext(memory: IUserMemory): {
    profileSection: string;
    factsSection: string;
  } {
    // Profile block
    const profileLines: string[] = [];
    if (memory.profile?.name) profileLines.push(`Name: ${memory.profile.name}`);
    if (memory.profile?.timezone) profileLines.push(`Timezone: ${memory.profile.timezone}`);
    if (memory.profile?.language) profileLines.push(`Preferred Language: ${memory.profile.language}`);

    // Any extra profile fields
    for (const [key, val] of Object.entries(memory.profile || {})) {
      if (!['name', 'timezone', 'language'].includes(key) && val !== undefined) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        profileLines.push(`${label}: ${val}`);
      }
    }

    // Filter out low-confidence and expired facts
    const now = new Date();
    const validFacts = (memory.facts || []).filter(
      (f: IMemoryFact) => f.confidence >= 0.6 && (!f.expiresAt || f.expiresAt > now)
    );

    // Format as dot-notation → natural language
    const factLines = validFacts.map((f: IMemoryFact) => {
      const label = f.key.replace(/_/g, ' ').replace(/\./g, ' → ');
      return `- ${label}: ${JSON.stringify(f.value)}`;
    });

    return {
      profileSection:
        profileLines.length > 0 ? profileLines.join('\n') : 'No profile data yet.',
      factsSection:
        factLines.length > 0
          ? factLines.join('\n')
          : 'No long-term memory about this user yet.',
    };
  }
}
