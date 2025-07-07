import type { SyncStateSchema } from '$lib/schema/sync.schema';
import type * as z from 'zod/v4';

export type SyncState = z.infer<typeof SyncStateSchema>;
