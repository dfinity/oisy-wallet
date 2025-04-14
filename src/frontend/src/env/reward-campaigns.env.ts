import rewardCampaignsJson from '$env/reward-campaigns.json';
import { RewardEventsSchema } from '$env/schema/env-reward.schema';
import type { RewardDescription } from '$env/types/env-reward';
import { parseBoolEnvVar } from '$lib/utils/env.utils';
import * as z from 'zod';

const parseResult = z.array(RewardEventsSchema).safeParse(rewardCampaignsJson);
export const rewardCampaigns: RewardDescription[] = parseResult.success ? parseResult.data : [];

// TODO: remove this feature flag when user snapshot live on production
export const USER_SNAPSHOT_ENABLED = parseBoolEnvVar(import.meta.env.VITE_USER_SNAPSHOT_ENABLED);

export const FEATURED_REWARD_CAROUSEL_SLIDE_ID = 'OISY Airdrop #1';
