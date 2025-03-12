import type { RewardEventsSchema } from '$env/schema/env-reward.schema';
import * as z from 'zod';

export type RewardDescription = z.infer<typeof RewardEventsSchema>;
