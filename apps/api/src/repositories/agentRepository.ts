import type pg from 'pg';
import type { AgentActionPayload, AgentContextType, AgentProposedAction } from '@osct/shared';

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

export type AgentActionRow = {
  id: string;
  session_id: string;
  user_id: string;
  action_type: 'comment_on_issue';
  payload: AgentActionPayload;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  github_response: { html_url?: string; id?: number } | null;
  error_message: string | null;
  created_at: Date;
  executed_at: Date | null;
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

  async createAction(input: {
    sessionId: string;
    userId: string;
    actionType: 'comment_on_issue';
    payload: AgentActionPayload;
  }): Promise<AgentActionRow> {
    const result = await this.db.query<AgentActionRow>(
      `INSERT INTO agent_actions (session_id, user_id, action_type, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING id, session_id, user_id, action_type, payload, status, github_response, error_message, created_at, executed_at`,
      [input.sessionId, input.userId, input.actionType, input.payload],
    );
    return result.rows[0]!;
  }

  async getActionForUser(actionId: string, userId: string): Promise<AgentActionRow | null> {
    const result = await this.db.query<AgentActionRow>(
      `SELECT id, session_id, user_id, action_type, payload, status, github_response, error_message, created_at, executed_at
       FROM agent_actions
       WHERE id = $1 AND user_id = $2`,
      [actionId, userId],
    );
    return result.rows[0] ?? null;
  }

  async listActionsForSession(sessionId: string, limit = 20): Promise<AgentActionRow[]> {
    const result = await this.db.query<AgentActionRow>(
      `SELECT id, session_id, user_id, action_type, payload, status, github_response, error_message, created_at, executed_at
       FROM agent_actions
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, limit],
    );
    return result.rows;
  }

  async updateActionPayload(actionId: string, payload: AgentActionPayload): Promise<void> {
    await this.db.query(`UPDATE agent_actions SET payload = $2 WHERE id = $1`, [actionId, payload]);
  }

  async markActionCompleted(
    actionId: string,
    githubResponse: { html_url: string; id: number },
  ): Promise<void> {
    await this.db.query(
      `UPDATE agent_actions
       SET status = 'completed', github_response = $2, executed_at = NOW(), error_message = NULL
       WHERE id = $1`,
      [actionId, githubResponse],
    );
  }

  async markActionFailed(actionId: string, errorMessage: string): Promise<void> {
    await this.db.query(
      `UPDATE agent_actions
       SET status = 'failed', error_message = $2, executed_at = NOW()
       WHERE id = $1`,
      [actionId, errorMessage],
    );
  }

  async markActionCancelled(actionId: string): Promise<void> {
    await this.db.query(
      `UPDATE agent_actions SET status = 'cancelled', executed_at = NOW() WHERE id = $1`,
      [actionId],
    );
  }
}

export function mapAgentActionRow(row: AgentActionRow): AgentProposedAction {
  return {
    id: row.id,
    type: row.action_type,
    status: row.status,
    preview: {
      owner: row.payload.owner,
      repo: row.payload.repo,
      number: row.payload.number,
      body: row.payload.body,
      issueUrl: `https://github.com/${row.payload.owner}/${row.payload.repo}/issues/${row.payload.number}`,
    },
    createdAt: row.created_at.toISOString(),
    executedAt: row.executed_at?.toISOString() ?? null,
    githubUrl: row.github_response?.html_url ?? null,
    errorMessage: row.error_message,
  };
}
