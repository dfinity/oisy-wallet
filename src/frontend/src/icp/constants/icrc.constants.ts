import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$icp-eth/constants/tokens.constants';
import type { IcCkInterface } from '$icp/types/ic';
import { LOCAL, PROD, STAGING } from '$lib/constants/app.constants';
import type { CanisterIdText } from '$lib/types/canister';
import { nonNullish } from '@dfinity/utils';

export const IC_CKBTC_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_LEDGER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'mxzaz-hqaaa-aaaar-qaada-cai';

export const IC_CKBTC_INDEX_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_INDEX_CANISTER_ID as CanisterIdText | null | undefined) ??
	'n5wcd-faaaa-aaaar-qaaea-cai';

export const IC_CKBTC_MINTER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKBTC_MINTER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'mqygn-kiaaa-aaaar-qaadq-cai';

export const STAGING_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKBTC_INDEX_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_INDEX_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKBTC_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

export const LOCAL_CKBTC_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const LOCAL_CKBTC_INDEX_CANISTER_ID = import.meta.env.VITE_LOCAL_CKBTC_INDEX_CANISTER_ID as
	| CanisterIdText
	| null
	| undefined;
export const LOCAL_CKBTC_MINTER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKBTC_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

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
				position: 3
			}
		: undefined;

const CKBTC_STAGING_DATA: IcCkInterface | undefined =
	(STAGING || PROD) &&
	nonNullish(STAGING_CKBTC_LEDGER_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_INDEX_CANISTER_ID) &&
	nonNullish(STAGING_CKBTC_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: STAGING_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: STAGING_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: STAGING_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				position: 2
			}
		: undefined;

const CKBTC_IC_DATA: IcCkInterface | undefined =
	STAGING || PROD
		? {
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
				exchangeCoinId: 'bitcoin',
				position: 1
			}
		: undefined;

export const CKBTC_LEDGER_CANISTER_IDS: [CanisterIdText, ...CanisterIdText[]] = [
	IC_CKBTC_LEDGER_CANISTER_ID,
	...(nonNullish(STAGING_CKBTC_LEDGER_CANISTER_ID) ? [STAGING_CKBTC_LEDGER_CANISTER_ID] : []),
	...(nonNullish(LOCAL_CKBTC_LEDGER_CANISTER_ID) ? [LOCAL_CKBTC_LEDGER_CANISTER_ID] : [])
];

/**
 * ckETH
 */

export const IC_CKETH_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_LEDGER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'ss2fx-dyaaa-aaaar-qacoq-cai';

export const IC_CKETH_INDEX_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_INDEX_CANISTER_ID as CanisterIdText | null | undefined) ??
	's3zol-vqaaa-aaaar-qacpa-cai';

export const IC_CKETH_MINTER_CANISTER_ID =
	(import.meta.env.VITE_IC_CKETH_MINTER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'sv3dd-oaaaa-aaaar-qacoa-cai';

export const STAGING_CKETH_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKETH_INDEX_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_INDEX_CANISTER_ID as CanisterIdText | null | undefined;
export const STAGING_CKETH_MINTER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CKETH_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

export const LOCAL_CKETH_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKETH_LEDGER_CANISTER_ID as CanisterIdText | null | undefined;
export const LOCAL_CKETH_INDEX_CANISTER_ID = import.meta.env.VITE_LOCAL_CKETH_INDEX_CANISTER_ID as
	| CanisterIdText
	| null
	| undefined;
export const LOCAL_CKETH_MINTER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CKETH_MINTER_CANISTER_ID as CanisterIdText | null | undefined;

const CKETH_LOCAL_DATA: IcCkInterface | undefined =
	LOCAL &&
	nonNullish(LOCAL_CKETH_LEDGER_CANISTER_ID) &&
	nonNullish(LOCAL_CKETH_INDEX_CANISTER_ID) &&
	nonNullish(LOCAL_CKETH_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: LOCAL_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: LOCAL_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: LOCAL_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				position: 3,
				twinToken: SEPOLIA_TOKEN
			}
		: undefined;

const CKETH_STAGING_DATA: IcCkInterface | undefined =
	(STAGING || PROD) &&
	nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID) &&
	nonNullish(STAGING_CKETH_INDEX_CANISTER_ID) &&
	nonNullish(STAGING_CKETH_MINTER_CANISTER_ID)
		? {
				ledgerCanisterId: STAGING_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: STAGING_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: STAGING_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				position: 2,
				twinToken: SEPOLIA_TOKEN
			}
		: undefined;

const CKETH_IC_DATA: IcCkInterface | undefined =
	STAGING || PROD
		? {
				ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
				exchangeCoinId: 'ethereum',
				position: 1,
				twinToken: ETHEREUM_TOKEN
			}
		: undefined;

export const CKETH_LEDGER_CANISTER_IDS: [CanisterIdText, ...CanisterIdText[]] = [
	IC_CKETH_LEDGER_CANISTER_ID,
	...(nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID) ? [STAGING_CKETH_LEDGER_CANISTER_ID] : []),
	...(nonNullish(LOCAL_CKETH_LEDGER_CANISTER_ID) ? [LOCAL_CKETH_LEDGER_CANISTER_ID] : [])
];

/**
 * All ICRC tokens data
 */

export const ICRC_TOKENS: IcCkInterface[] = [
	...(nonNullish(CKBTC_LOCAL_DATA) ? [CKBTC_LOCAL_DATA] : []),
	...(nonNullish(CKBTC_STAGING_DATA) ? [CKBTC_STAGING_DATA] : []),
	...(nonNullish(CKBTC_IC_DATA) ? [CKBTC_IC_DATA] : []),
	...(nonNullish(CKETH_LOCAL_DATA) ? [CKETH_LOCAL_DATA] : []),
	...(nonNullish(CKETH_STAGING_DATA) ? [CKETH_STAGING_DATA] : []),
	...(nonNullish(CKETH_IC_DATA) ? [CKETH_IC_DATA] : [])
];
