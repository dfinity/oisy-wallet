import type { CriterionEligibility, EligibilityReport } from '$declarations/rewards/rewards.did';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import { RewardType } from '$lib/enums/reward-type';
import { getRewards } from '$lib/services/reward.services';
import type {
	CampaignCriterion,
	CampaignEligibility,
	HangoverCriterion,
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
			const containsJackpot: boolean = newRewards.some(({ name }) => name === RewardType.JACKPOT);
			const containsReferral: boolean = newRewards.some(({ name }) => name === RewardType.REFERRAL);

			const rewardType = containsJackpot
				? RewardType.JACKPOT
				: containsReferral
					? RewardType.REFERRAL
					: RewardType.AIRDROP;

			return {
				reward: getFirstReward({ rewards, containsJackpot, containsReferral }),
				lastTimestamp,
				rewardType
			};
		}

		if (lastTimestamp === 0n) {
			return { lastTimestamp };
		}
	}

	return {};
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
		return rewards.find(({ name }) => name === RewardType.JACKPOT);
	}
	if (containsReferral) {
		return rewards.find(({ name }) => name === RewardType.REFERRAL);
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
	if ('Hangover' in criterion.criterion) {
		const duration = criterion.criterion.Hangover;
		if ('Days' in duration) {
			const days = duration.Days;
			return {
				satisfied: criterion.satisfied,
				type: RewardCriterionType.HANGOVER,
				days
			} as HangoverCriterion;
		}
		return { satisfied: criterion.satisfied, type: RewardCriterionType.UNKNOWN };
	}

	return { satisfied: criterion.satisfied, type: RewardCriterionType.UNKNOWN };
};
