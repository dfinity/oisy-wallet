import { getAirdrops } from '$lib/services/reward-code.services';
import type { AirdropInfo, AirdropResult } from '$lib/types/airdrop';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';

export const INITIAL_AIRDROP_RESULT = 'initialAirdropResult';

export const loadAirdropResult = async (identity: Identity): Promise<AirdropResult> => {
	const initialLoading: string | null = sessionStorage.getItem(INITIAL_AIRDROP_RESULT);
	if (isNullish(initialLoading)) {
		const { airdrops, lastTimestamp } = await getAirdrops({ identity });
		const newAirdrops: AirdropInfo[] = airdrops.filter(
			({ timestamp }) => timestamp >= lastTimestamp
		);

		sessionStorage.setItem(INITIAL_AIRDROP_RESULT, 'true');

		if (newAirdrops.length > 0) {
			const containsJackpot: boolean = newAirdrops.some(({ name }) => name === 'jackpot');
			return { receivedAirdrop: true, receivedJackpot: containsJackpot };
		}
	}

	return { receivedAirdrop: false, receivedJackpot: false };
};
