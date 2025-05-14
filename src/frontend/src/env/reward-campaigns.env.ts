import rewardCampaignsJson from '$env/reward-campaigns.json';
import { RewardEventsSchema } from '$env/schema/env-reward.schema';
import type { RewardDescription } from '$env/types/env-reward';
import * as z from 'zod';

const parseResult = z.array(RewardEventsSchema).safeParse(rewardCampaignsJson);
export const rewardCampaigns: RewardDescription[] = parseResult.success ? parseResult.data : [];

export const FEATURED_REWARD_CAROUSEL_SLIDE_ID = '';
