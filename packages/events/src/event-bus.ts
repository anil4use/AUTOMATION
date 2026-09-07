export interface DomainEvent {
  eventName: string;
  timestamp: Date;
  payload: Record<string, any>;
}

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, EventHandler[]> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  async publish(eventName: string, payload: Record<string, any>): Promise<void> {
    const event: DomainEvent = { eventName, timestamp: new Date(), payload };
    const list = this.handlers.get(eventName) || [];
    for (const handler of list) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus Error] Event handler for '${eventName}' failed:`, err);
      }
    }
  }
}

export const eventBus = EventBus.getInstance();
