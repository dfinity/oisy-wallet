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
