import rewardCampaignsJson from '$env/reward-campaigns.json';
import { RewardCampaignSchema } from '$env/schema/env-reward-campaign.schema';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import * as z from 'zod/v4';

const parseResult = z.array(RewardCampaignSchema).safeParse(rewardCampaignsJson);
export const rewardCampaigns: RewardCampaignDescription[] = parseResult.success
	? parseResult.data
	: [];

export const SPRINKLES_SEASON_1_EPISODE_3_ID = 'sprinkles_s1e3';
export const SPRINKLES_SEASON_1_EPISODE_4_ID = 'sprinkles_s1e4';
export const SPRINKLES_SEASON_1_EPISODE_5_ID = 'sprinkles_s1e5';

export const FEATURED_REWARD_CAROUSEL_SLIDE_ID = SPRINKLES_SEASON_1_EPISODE_5_ID;
