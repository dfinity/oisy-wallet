import type { SyncStateSchema } from '$lib/schema/sync.schema';
import type * as z from 'zod';

export type SyncState = z.infer<typeof SyncStateSchema>;
