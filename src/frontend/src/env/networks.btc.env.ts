import {
	IC_CKBTC_MINTER_CANISTER_ID,
	STAGING_CKBTC_MINTER_CANISTER_ID
} from '$env/networks.ircrc.env';
import type { MinterCanisterIdText } from '$icp/types/canister';
import type { CanisterIdText } from '$lib/types/canister';
import { nonNullish } from '@dfinity/utils';

export const BITCOIN_CANISTER_IDS: Record<MinterCanisterIdText, CanisterIdText> = {
	...(nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID) && {
		[STAGING_CKBTC_MINTER_CANISTER_ID]: 'g4xu7-jiaaa-aaaan-aaaaq-cai'
	}),
	...(nonNullish(IC_CKBTC_MINTER_CANISTER_ID) && {
		[IC_CKBTC_MINTER_CANISTER_ID]: 'ghsi2-tqaaa-aaaan-aaaca-cai'
	})
};

export const BTC_MAINNET_ENABLED =
	JSON.parse(import.meta.env.VITE_BITCOIN_MAINNET ?? false) === true;

// TODO: to be removed when we have finished implementing all the Bitcoin features
export const NETWORK_BITCOIN_ENABLED =
	JSON.parse(import.meta.env.VITE_NETWORK_BITCOIN_ENABLED ?? false) === true;
