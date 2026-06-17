import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AgentChatRequest } from '@osct/shared';
import { AppError } from '../middleware/errorHandler.js';
import { AgentService } from '../services/agentService.js';

const agentContextSchema = z.object({
  type: z.enum(['general', 'issue', 'pull_request']),
  owner: z.string().trim().min(1).optional(),
  repo: z.string().trim().min(1).optional(),
  number: z.coerce.number().int().positive().optional(),
});

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
  context: agentContextSchema.optional(),
});

export function createAgentRoutes(agent: AgentService) {
  return {
    async chat(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const parsed = chatBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request', 'VALIDATION_ERROR');
      }

      const body = parsed.data as AgentChatRequest;
      const data = await agent.chat(req.user.id, body);
      res.json({ data });
    },

    async session(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const sessionId = req.params.id;
      if (!sessionId) {
        throw new AppError(400, 'Session id is required', 'VALIDATION_ERROR');
      }

      const data = await agent.getSession(req.user.id, sessionId);
      res.json({ data });
    },

    async status(_req: Request, res: Response): Promise<void> {
      const info = agent.getProviderInfo();
      res.json({
        data: {
          enabled: agent.isEnabled(),
          provider: info?.provider ?? null,
          model: info?.model ?? null,
        },
      });
    },
  };
}
