import type { Principal } from '@dfinity/principal';

export interface RewardsResponse {
	rewards: RewardResponseInfo[];
	lastTimestamp: bigint;
}

export interface RewardResponseInfo {
	name: string | undefined;
	campaignName: string | undefined;
	ledger: Principal;
	timestamp: bigint;
	amount: bigint;
}

export interface RewardResult {
	receivedReward: boolean;
	receivedJackpot: boolean;
	receivedReferral: boolean;
}
