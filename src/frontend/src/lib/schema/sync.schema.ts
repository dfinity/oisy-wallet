import * as z from 'zod/v4';

export const SyncStateSchema = z.enum(['idle', 'in_progress', 'error']);
