import type { SyncStateSchema } from '$lib/schema/sync.schema';
import { z } from 'zod';

export type SyncState = z.infer<typeof SyncStateSchema>;
