import type { RewardCampaignSchema } from '$env/schema/env-reward-campaign.schema';
import type * as z from 'zod/v4';

export type RewardCampaignDescription = z.infer<typeof RewardCampaignSchema>;
