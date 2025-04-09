import type { RewardEventsSchema } from '$env/schema/env-reward.schema';
import type * as z from 'zod';

export type RewardDescription = z.infer<typeof RewardEventsSchema>;
