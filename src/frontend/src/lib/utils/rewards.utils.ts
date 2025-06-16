import type { CriterionEligibility, EligibilityReport } from '$declarations/rewards/rewards.did';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import { getRewards } from '$lib/services/reward.services';
import type {
	CampaignCriterion,
	CampaignEligibility,
	MinLoginsCriterion,
	MinTotalAssetsUsdCriterion,
	MinTransactionsCriterion,
	RewardResponseInfo,
	RewardResult
} from '$lib/types/reward';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';

export const INITIAL_REWARD_RESULT = 'initialRewardResult';

export const loadRewardResult = async (identity: Identity): Promise<RewardResult> => {
	const initialLoading: string | null = sessionStorage.getItem(INITIAL_REWARD_RESULT);
	if (isNullish(initialLoading)) {
		const { rewards, lastTimestamp } = await getRewards({ identity });
		const newRewards: RewardResponseInfo[] = rewards.filter(
			({ timestamp }) => timestamp >= lastTimestamp
		);

		sessionStorage.setItem(INITIAL_REWARD_RESULT, 'true');

		if (newRewards.length > 0) {
			const containsJackpot: boolean = newRewards.some(({ name }) => name === 'jackpot');
			const containsReferral: boolean = newRewards.some(({ name }) => name === 'referral');

			return {
				receivedReward: true,
				receivedJackpot: containsJackpot,
				receivedReferral: containsReferral,
				reward: getFirstReward({ rewards, containsJackpot, containsReferral }),
				lastTimestamp
			};
		}

		if (lastTimestamp === 0n) {
			return {
				receivedReward: false,
				receivedJackpot: false,
				receivedReferral: false,
				lastTimestamp
			};
		}
	}

	return { receivedReward: false, receivedJackpot: false, receivedReferral: false };
};

const getFirstReward = ({
	rewards,
	containsJackpot,
	containsReferral
}: {
	rewards: RewardResponseInfo[];
	containsJackpot: boolean;
	containsReferral: boolean;
}): RewardResponseInfo | undefined => {
	if (containsJackpot) {
		return rewards.find(({ name }) => name === 'jackpot');
	}
	if (containsReferral) {
		return rewards.find(({ name }) => name === 'referral');
	}

	return rewards.at(0);
};

export const isOngoingCampaign = ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
	const currentDate = new Date(Date.now());
	const startDiff = startDate.getTime() - currentDate.getTime();
	const endDiff = endDate.getTime() - currentDate.getTime();

	return startDiff <= 0 && endDiff > 0;
};

export const isUpcomingCampaign = (startDate: Date) => {
	const currentDate = new Date(Date.now());
	const startDiff = startDate.getTime() - currentDate.getTime();

	return startDiff > 0;
};

export const isEndedCampaign = (endDate: Date) => {
	const currentDate = new Date(Date.now());
	const endDiff = endDate.getTime() - currentDate.getTime();

	return endDiff <= 0;
};

export const getCampaignState = (reward: RewardCampaignDescription) =>
	isOngoingCampaign({ startDate: reward.startDate, endDate: reward.endDate })
		? 'ongoing'
		: isEndedCampaign(reward.endDate)
			? 'ended'
			: 'upcoming';

export const mapEligibilityReport = (eligibilityReport: EligibilityReport): CampaignEligibility[] =>
	eligibilityReport.campaigns.map(([campaignId, eligibility]) => {
		const criteria = eligibility.criteria.map((criterion) => mapCriterion(criterion));

		return {
			campaignId,
			available: eligibility.available,
			eligible: eligibility.eligible,
			criteria
		};
	});

const mapCriterion = (criterion: CriterionEligibility): CampaignCriterion => {
	if ('MinLogins' in criterion.criterion) {
		const { duration, count } = criterion.criterion.MinLogins;
		if ('Days' in duration) {
			const days = duration.Days;
			return {
				satisfied: criterion.satisfied,
				type: RewardCriterionType.MIN_LOGINS,
				days,
				count
			} as MinLoginsCriterion;
		}
		return { satisfied: criterion.satisfied, type: RewardCriterionType.UNKNOWN };
	}
	if ('MinTransactions' in criterion.criterion) {
		const { duration, count } = criterion.criterion.MinTransactions;
		if ('Days' in duration) {
			const days = duration.Days;
			return {
				satisfied: criterion.satisfied,
				type: RewardCriterionType.MIN_TRANSACTIONS,
				days,
				count
			} as MinTransactionsCriterion;
		}
		return { satisfied: criterion.satisfied, type: RewardCriterionType.UNKNOWN };
	}
	if ('MinTotalAssetsUsd' in criterion.criterion) {
		const { usd } = criterion.criterion.MinTotalAssetsUsd;

		return {
			satisfied: criterion.satisfied,
			type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
			usd
		} as MinTotalAssetsUsdCriterion;
	}

	return { satisfied: criterion.satisfied, type: RewardCriterionType.UNKNOWN };
};
