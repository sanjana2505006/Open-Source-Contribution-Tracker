import type pg from 'pg';
import type { AgentContextType } from '@osct/shared';

export type AgentSessionRow = {
  id: string;
  user_id: string;
  context_type: string | null;
  context_ref: string | null;
  created_at: Date;
  updated_at: Date;
};

export type AgentMessageRow = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
};

export class AgentRepository {
  constructor(private db: pg.Pool) {}

  async createSession(input: {
    userId: string;
    contextType?: AgentContextType | null;
    contextRef?: string | null;
  }): Promise<AgentSessionRow> {
    const result = await this.db.query<AgentSessionRow>(
      `INSERT INTO agent_sessions (user_id, context_type, context_ref)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, context_type, context_ref, created_at, updated_at`,
      [input.userId, input.contextType ?? null, input.contextRef ?? null],
    );
    return result.rows[0]!;
  }

  async getSessionForUser(sessionId: string, userId: string): Promise<AgentSessionRow | null> {
    const result = await this.db.query<AgentSessionRow>(
      `SELECT id, user_id, context_type, context_ref, created_at, updated_at
       FROM agent_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    return result.rows[0] ?? null;
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.db.query(
      `UPDATE agent_sessions SET updated_at = NOW() WHERE id = $1`,
      [sessionId],
    );
  }

  async addMessage(input: {
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }): Promise<AgentMessageRow> {
    const result = await this.db.query<AgentMessageRow>(
      `INSERT INTO agent_messages (session_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING id, session_id, role, content, created_at`,
      [input.sessionId, input.role, input.content],
    );
    return result.rows[0]!;
  }

  async listMessages(sessionId: string, limit = 20): Promise<AgentMessageRow[]> {
    const result = await this.db.query<AgentMessageRow>(
      `SELECT id, session_id, role, content, created_at
       FROM agent_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, limit],
    );
    return result.rows;
  }
}
