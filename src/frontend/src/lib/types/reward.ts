import type { ClaimedVipReward, ClaimVipRewardResponse } from '$declarations/rewards/rewards.did';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import type { QrCodeType } from '$lib/enums/qr-code-types';
import type { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import type { RewardType } from '$lib/enums/reward-type';
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
	reward?: RewardResponseInfo;
	lastTimestamp?: bigint;
	rewardType?: RewardType;
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

export interface RewardStateData {
	reward: RewardCampaignDescription;
	rewardType?: RewardType;
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
	probabilityMultiplierEnabled?: boolean;
	probabilityMultiplier?: number;
}

export interface CampaignCriterion {
	satisfied: boolean;
	type: RewardCriterionType;
}

export interface MinLoginsCriterion extends CampaignCriterion {
	days: bigint;
	count: number;
}

export interface MinTransactionsCriterion extends CampaignCriterion {
	days: bigint;
	count: number;
}

export interface MinTransactionsInNetworkCriterion extends CampaignCriterion {
	days: bigint;
	count: number;
}

export interface MinTotalAssetsUsdCriterion extends CampaignCriterion {
	usd: number;
}

export interface MinTotalAssetsUsdInNetworkCriterion extends CampaignCriterion {
	usd: number;
}

export interface HangoverCriterion extends CampaignCriterion {
	days: bigint;
}
