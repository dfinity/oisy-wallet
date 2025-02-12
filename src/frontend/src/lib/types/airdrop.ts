import type { RewardInfo } from '$declarations/rewards/rewards.did';

export interface AirdropsResponse {
    airdrops: RewardInfo[];
    last_timestamp: bigint;
}