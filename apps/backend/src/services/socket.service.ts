import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getRedisSubscriber, getRedisPublisher } from '../infrastructure/redis';

let io: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('join_org', (orgId: string) => {
      socket.join(`org_${orgId}`);
      logger.info(`[Socket.io] Socket ${socket.id} joined room org_${orgId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Subscribe to Redis pub/sub channel for execution events from worker process
  try {
    const sub = getRedisSubscriber();
    sub.subscribe('execution_events', (err) => {
      if (err) logger.error('[Socket.io] Failed to subscribe to execution_events:', err);
      else logger.info('[Socket.io] Subscribed to Redis execution_events channel');
    });

    sub.on('message', (channel, message) => {
      if (channel === 'execution_events' && io) {
        try {
          const payload = JSON.parse(message);
          if (payload.orgId) {
            if (payload.event === 'connection:auth_expired') {
              io.to(`org_${payload.orgId}`).emit('connection:auth_expired', payload.payload || payload);
            } else {
              io.to(`org_${payload.orgId}`).emit('execution_update', payload);
            }
          }
        } catch (e) {
          logger.error('[Socket.io] Error parsing pubsub message:', e);
        }
      }
    });
  } catch (e) {
    logger.error('[Socket.io] Redis PubSub initialization failed:', e);
  }

  return io;
}

export function emitExecutionUpdate(orgId: string, payload: any) {
  if (io) {
    io.to(`org_${orgId}`).emit('execution_update', payload);
  }
}

export function emitAuthExpired(orgId: string, payload: any) {
  if (!orgId) return;
  try {
    const pub = getRedisPublisher();
    pub.publish('execution_events', JSON.stringify({ event: 'connection:auth_expired', orgId, payload }));
  } catch (e) {
    if (io) {
      io.to(`org_${orgId}`).emit('connection:auth_expired', payload);
    }
  }
}

