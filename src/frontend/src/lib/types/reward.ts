import type { ClaimedVipReward, ClaimVipRewardResponse } from '$declarations/rewards/rewards.did';
import type { QrCodeType } from '$lib/enums/qr-code-types';
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

export interface RewardClaimApiResponse {
	claimRewardResponse: ClaimVipRewardResponse;
	claimedVipReward: ClaimedVipReward | undefined;
}

export interface RewardClaimResponse<T = unknown> {
	success: boolean;
	campaignId?: string;
	err?: T;
}

export interface UserRoleResult {
	is_vip: boolean;
	is_gold: boolean;
}

export interface VipRewardStateData {
	success: boolean;
	codeType: QrCodeType;
}
