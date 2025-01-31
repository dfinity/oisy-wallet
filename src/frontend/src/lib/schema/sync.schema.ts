import * as z from 'zod';

export const SyncStateSchema = z.enum(['idle', 'in_progress', 'error']);
