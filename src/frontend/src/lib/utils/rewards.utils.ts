import { ZERO } from '$lib/constants/app.constants';
import { getRewards } from '$lib/services/reward-code.services';
import type { RewardInfo, RewardResult } from '$lib/types/reward';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const INITIAL_REWARD_RESULT = 'initialRewardResult';

export const loadRewardResult = async (identity: Identity): Promise<RewardResult> => {
	const initialLoading: string | null = sessionStorage.getItem(INITIAL_REWARD_RESULT);
	if (isNullish(initialLoading)) {
		const { rewards, lastTimestamp } = await getRewards({ identity });
		const newRewards: RewardInfo[] = rewards.filter(
			({ timestamp }) => timestamp >= lastTimestamp
		);

		sessionStorage.setItem(INITIAL_REWARD_RESULT, 'true');

		if (newRewards.length > 0) {
			const containsJackpot: boolean = newRewards.some(({ name }) => name === 'jackpot');
			return { receivedReward: true, receivedJackpot: containsJackpot };
		}
	}

	return { receivedReward: false, receivedJackpot: false };
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

export const getRewardsBalance = (rewards: RewardInfo[]) =>
	rewards.reduce((total, { amount }) => total.add(BigNumber.from(amount)), ZERO);
