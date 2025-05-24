import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
  turns: number;
  status: 'active' | 'completed' | 'aborted';
  totalTokens: number;
  totalCost: number;
  traces: string[]; // Array of trace IDs
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerSession: number;
  averageCostPerSession: number;
}

export class SessionManager {
  private sessions = new Map<string, Session>();

  /**
   * Create a new session
   */
  createSession(metadata: Record<string, any> = {}): Session {
    const session: Session = {
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...metadata,
        userAgent: metadata.userAgent || 'api-client',
        source: metadata.source || 'api',
      },
      turns: 0,
      status: 'active',
      totalTokens: 0,
      totalCost: 0,
      traces: [],
    };

    this.sessions.set(session.id, session);
    
    console.log(`📝 Session created: ${session.id}`);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session with new data
   */
  updateSession(sessionId: string, updates: Partial<Session>): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = {
      ...session,
      ...updates,
      updatedAt: new Date(),
      // Prevent overwriting critical fields
      id: session.id,
      createdAt: session.createdAt,
    };

    this.sessions.set(sessionId, updated);
    return updated;
  }

  /**
   * Add tokens and cost to session
   */
  addUsage(sessionId: string, tokens: number, cost: number, traceId?: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.totalTokens += tokens;
    session.totalCost += cost;
    session.updatedAt = new Date();
    
    if (traceId && !session.traces.includes(traceId)) {
      session.traces.push(traceId);
    }

    console.log(`💰 Session ${sessionId}: +${tokens} tokens (+$${cost.toFixed(6)})`);
    return session;
  }

  /**
   * Increment turn count
   */
  incrementTurn(sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.turns++;
    session.updatedAt = new Date();
    
    console.log(`🔄 Session ${sessionId}: Turn ${session.turns}`);
    return session;
  }

  /**
   * Mark session as completed
   */
  completeSession(sessionId: string): Session {
    return this.updateSession(sessionId, { status: 'completed' });
  }

  /**
   * Mark session as aborted
   */
  abortSession(sessionId: string): Session {
    return this.updateSession(sessionId, { status: 'aborted' });
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️  Session deleted: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * List all sessions
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * List active sessions
   */
  getActiveSessions(): Session[] {
    return this.listSessions().filter(session => session.status === 'active');
  }

  /**
   * Get session statistics
   */
  getStats(): SessionStats {
    const sessions = this.listSessions();
    const activeSessions = sessions.filter(s => s.status === 'active');
    
    const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
    const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalTokens,
      totalCost,
      averageTokensPerSession: sessions.length > 0 ? totalTokens / sessions.length : 0,
      averageCostPerSession: sessions.length > 0 ? totalCost / sessions.length : 0,
    };
  }

  /**
   * Clean up old sessions
   */
  cleanupSessions(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, session] of this.sessions.entries()) {
      const age = now - session.updatedAt.getTime();
      if (age > maxAge) {
        this.sessions.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old sessions`);
    }

    return cleanedCount;
  }

  /**
   * Find sessions by metadata criteria
   */
  findSessions(criteria: Record<string, any>): Session[] {
    return this.listSessions().filter(session => {
      return Object.entries(criteria).every(([key, value]) => {
        return session.metadata[key] === value;
      });
    });
  }

  /**
   * Get session summary for reporting
   */
  getSessionSummary(sessionId: string): any {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      duration: session.updatedAt.getTime() - session.createdAt.getTime(),
      turns: session.turns,
      totalTokens: session.totalTokens,
      totalCost: session.totalCost,
      avgTokensPerTurn: session.turns > 0 ? session.totalTokens / session.turns : 0,
      avgCostPerTurn: session.turns > 0 ? session.totalCost / session.turns : 0,
      status: session.status,
      traceCount: session.traces.length,
      metadata: session.metadata,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager(); 