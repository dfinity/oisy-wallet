import {isNullish} from "@dfinity/utils";
import {getAirdrops} from "$lib/services/reward-code.services";
import type {AirdropInfo, AirdropResult} from "$lib/types/airdrop";
import type {Identity} from "@dfinity/agent";

export const INITIAL_AIRDROP_RESULT = 'initialAirdropResult';

export const loadAirdropResult = async (identity: Identity): Promise<AirdropResult> => {
    const initialLoading: string | null = sessionStorage.getItem(INITIAL_AIRDROP_RESULT);
    if (isNullish(initialLoading)) {
        const { airdrops, lastTimestamp } = await getAirdrops({ identity });
        const newAirdrops: AirdropInfo[] = airdrops.filter((airdrop) => airdrop.timestamp >= lastTimestamp);

        sessionStorage.setItem(INITIAL_AIRDROP_RESULT, 'true');

        if (newAirdrops.length > 0) {
            const containsJackpot: boolean = newAirdrops.some((airdrop) => airdrop.name === 'jackpot');
            return {isAirdrop: true, isJackpot: containsJackpot};
        }
    }

    return {isAirdrop: false, isJackpot: false};
}