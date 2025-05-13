import type { ClaimedVipReward, ClaimVipRewardResponse } from '$declarations/rewards/rewards.did';
import type { QrCodeType } from '$lib/enums/qr-code-types';
import type { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import type { Principal } from '@dfinity/principal';

export interface RewardsResponse {
	rewards: RewardResponseInfo[];
	lastTimestamp: bigint;
}

export interface RewardResponseInfo {
	name: string | undefined;
	campaignName: string | undefined;
	campaignId: string;
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
	campaignId?: QrCodeType;
	err?: T;
}

export interface UserRoleResult {
	isVip: boolean;
	isGold: boolean;
}

export interface VipRewardStateData {
	success: boolean;
	codeType: QrCodeType;
}

export interface CampaignEligibility {
	campaignId: string;
	available: boolean;
	eligible: boolean;
	criteria: CampaignCriterion[];
}

export interface CampaignCriterion {
	satisfied: boolean;
	type: RewardCriterionType;
	days?: bigint;
	count?: number;
	usd?: number;
}
