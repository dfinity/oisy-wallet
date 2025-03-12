import type { SyncStateSchema } from '$lib/schema/sync.schema';
import * as z from 'zod';

export type SyncState = z.infer<typeof SyncStateSchema>;
