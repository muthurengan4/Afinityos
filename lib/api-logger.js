import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

export const apiLogger = {
  async log(ctx, statusCode, error = null) {
    try {
      const db = await getDb();
      await db.collection('api_logs').insertOne({
        id: uuidv4(),
        requestId: ctx.requestId,
        organizationId: ctx.user?.organizationId || null,
        userId: ctx.user?.id || null,
        userEmail: ctx.user?.email || null,
        method: ctx.method,
        path: ctx.path,
        statusCode,
        durationMs: Date.now() - ctx.startedAt,
        module: ctx.module || null,
        error,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('apiLogger error:', e?.message);
    }
  },
};
