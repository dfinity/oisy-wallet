import type { RewardInfo } from '$declarations/rewards/rewards.did';

export type AirdropsResponse = {
	airdrops: RewardInfo[];
	last_timestamp: bigint;
};
