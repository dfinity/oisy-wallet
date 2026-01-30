import { CKBTC_EXPLORER_URL, CKBTC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
import { BTC_TOKEN_GROUP } from '$env/tokens/groups/groups.btc.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import type { MinterCanisterIdText } from '$icp/types/canister';
import type { IcCkInterface, IcInterface } from '$icp/types/ic-token';
import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';
import type { CanisterIdText, OptionCanisterIdText } from '$lib/types/canister';
import type { NonEmptyArray } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';




export const IC_CKBTC_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_LEDGER_CANISTER_ID as OptionCanisterIdText) ??
	'mxzaz-hqaaa-aaaar-qaada-cai';

export const IC_CKBTC_INDEX_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_INDEX_CANISTER_ID as OptionCanisterIdText) ??
	'n5wcd-faaaa-aaaar-qaaea-cai';

export const IC_CKBTC_MINTER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_MINTER_CANISTER_ID as OptionCanisterIdText) ??
	'mqygn-kiaaa-aaaar-qaadq-cai';

export const STAGING_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_LEDGER_CANISTER_ID as OptionCanisterIdText;

export const STAGING_CKBTC_INDEX_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_INDEX_CANISTER_ID as OptionCanisterIdText;

export const STAGING_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_MINTER_CANISTER_ID as OptionCanisterIdText;

export const LOCAL_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_LEDGER_CANISTER_ID as OptionCanisterIdText;

export const LOCAL_CKBTC_INDEX_CANISTER_ID = import.meta.env.VITE_LOCAL_CKBTC_INDEX_CANISTER_ID as
	| CanisterIdText
	| null
	| undefined;

export const LOCAL_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_MINTER_CANISTER_ID as OptionCanisterIdText;

const CKBTC_LOCAL_DATA: IcCkInterface | undefined =
	LOCAL &&
	nonNullish(LOCAL_CKBTC_LEDGER_CANISTER_ID) &&
	nonNullish(LOCAL_CKBTC_INDEX_CANISTER_ID) &&
	nonNullish(LOCAL_CKBTC_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: LOCAL_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: LOCAL_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: LOCAL_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				twinToken: BTC_TESTNET_TOKEN
			}
		: undefined;

const CKBTC_STAGING_DATA: IcCkInterface | undefined =
	(STAGING || BETA || PROD) &&
	nonNullish(STAGING_CKBTC_LEDGER_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_INDEX_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: STAGING_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: STAGING_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: STAGING_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				twinToken: BTC_TESTNET_TOKEN,
				explorerUrl: CKBTC_TESTNET_EXPLORER_URL
			}
		: undefined;

export const CKBTC_IC_DATA: IcCkInterface | undefined =
	STAGING || BETA || PROD
		? {
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				twinToken: BTC_MAINNET_TOKEN,
				groupData: BTC_TOKEN_GROUP,
				explorerUrl: CKBTC_EXPLORER_URL
			}
		: undefined;

export const CKBTC_LEDGER_CANISTER_TESTNET_IDS: CanisterIdText[] = [
	...(nonNullish(STAGING_CKBTC_LEDGER_CANISTER_ID) ? [STAGING_CKBTC_LEDGER_CANISTER_ID] : []),
	...(nonNullish(LOCAL_CKBTC_LEDGER_CANISTER_ID) ? [LOCAL_CKBTC_LEDGER_CANISTER_ID] : [])
];

export const CKBTC_LEDGER_CANISTER_IDS: NonEmptyArray<CanisterIdText> = [
	IC_CKBTC_LEDGER_CANISTER_ID,
	...CKBTC_LEDGER_CANISTER_TESTNET_IDS
];

export const ICRC_CK_BTC_TOKENS: IcInterface[] = [
	...(nonNullish(CKBTC_LOCAL_DATA) ? [CKBTC_LOCAL_DATA] : []),
	...(nonNullish(CKBTC_STAGING_DATA) ? [CKBTC_STAGING_DATA] : [])
];

export const BITCOIN_CANISTER_IDS: Record<MinterCanisterIdText, CanisterIdText> = {
	...(nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID) && {
		[STAGING_CKBTC_MINTER_CANISTER_ID]: 'g4xu7-jiaaa-aaaan-aaaaq-cai'
	}),
	...(nonNullish(IC_CKBTC_MINTER_CANISTER_ID) && {
		[IC_CKBTC_MINTER_CANISTER_ID]: 'ghsi2-tqaaa-aaaan-aaaca-cai'
	})
};
