import {
	CKBTC_IC_DATA,
	CKBTC_LEDGER_CANISTER_TESTNET_IDS,
	IC_CKBTC_LEDGER_CANISTER_ID,
	ICRC_CK_BTC_TOKENS
} from '$env/tokens/tokens-icp/tokens.icp.ck.btc.env';
import {
	CKERC20_LEDGER_CANISTER_TESTNET_IDS,
	CKUSDC_IC_DATA,
	IC_CKUSDC_LEDGER_CANISTER_ID,
	IC_CKUSDT_LEDGER_CANISTER_ID,
	ICRC_CK_ERC20_TOKENS
} from '$env/tokens/tokens-icp/tokens.icp.ck.erc20.env';
import {
	CKETH_IC_DATA,
	CKETH_LEDGER_CANISTER_TESTNET_IDS,
	IC_CKETH_LEDGER_CANISTER_ID,
	ICRC_CK_ETH_TOKENS
} from '$env/tokens/tokens-icp/tokens.icp.ck.eth.env';
import {
	ADDITIONAL_ICRC_TOKENS,
	TICRC1_LEDGER_CANISTER_ID
} from '$env/tokens/tokens-icp/tokens.icrc.additional.env';
import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcInterface } from '$icp/types/ic-token';
import { mapIcrcData } from '$icp/utils/map-icrc-data';
import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';
import type { CanisterIdText, OptionCanisterIdText } from '$lib/types/canister';
import { nonNullish } from '@dfinity/utils';

export const IC_CYCLES_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_IC_CYCLES_LEDGER_CANISTER_ID as OptionCanisterIdText) ??
	'um5iw-rqaaa-aaaaq-qaaba-cai';

export const STAGING_CYCLES_LEDGER_CANISTER_ID = import.meta.env
	.VITE_STAGING_CYCLES_LEDGER_CANISTER_ID as OptionCanisterIdText;

export const LOCAL_CYCLES_LEDGER_CANISTER_ID = import.meta.env
	.VITE_LOCAL_CYCLES_LEDGER_CANISTER_ID as OptionCanisterIdText;

export const CYCLES_LEDGER_CANISTER_ID: CanisterIdText =
	LOCAL && nonNullish(LOCAL_CYCLES_LEDGER_CANISTER_ID)
		? LOCAL_CYCLES_LEDGER_CANISTER_ID
		: (STAGING || BETA || PROD) && nonNullish(STAGING_CYCLES_LEDGER_CANISTER_ID)
			? STAGING_CYCLES_LEDGER_CANISTER_ID
			: IC_CYCLES_LEDGER_CANISTER_ID;

const ADDITIONAL_ICRC_PRODUCTION_DATA = mapIcrcData(additionalIcrcTokens);

/**
 * All ICRC tokens data
 */

// The subset of the ICRC tokens that are also displayed if the user is not signed in.
export const PUBLIC_ICRC_TOKENS: IcInterface[] = [
	...(nonNullish(CKBTC_IC_DATA) ? [CKBTC_IC_DATA] : []),
	...(nonNullish(CKETH_IC_DATA) ? [CKETH_IC_DATA] : []),
	...(nonNullish(CKUSDC_IC_DATA) ? [CKUSDC_IC_DATA] : [])
];

const ICRC_CK_TOKENS: IcInterface[] = [
	...ICRC_CK_BTC_TOKENS,
	...ICRC_CK_ETH_TOKENS,
	...ICRC_CK_ERC20_TOKENS
];

export const ICRC_TOKENS: IcInterface[] = [
	...PUBLIC_ICRC_TOKENS,
	...ADDITIONAL_ICRC_TOKENS,
	...ICRC_CK_TOKENS
];

export const ICRC_CK_TOKENS_LEDGER_CANISTER_IDS: LedgerCanisterIdText[] = [
	...ICRC_CK_TOKENS,
	...PUBLIC_ICRC_TOKENS
].map(({ ledgerCanisterId }) => ledgerCanisterId);

export const ICRC_LEDGER_CANISTER_TESTNET_IDS = [
	...CKBTC_LEDGER_CANISTER_TESTNET_IDS,
	...CKETH_LEDGER_CANISTER_TESTNET_IDS,
	...CKERC20_LEDGER_CANISTER_TESTNET_IDS,
	TICRC1_LEDGER_CANISTER_ID
];

// On Chain Fusion view, we want to display ICP, Ethereum and selected CK tokens.
export const ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS = [
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID,
	...(nonNullish(IC_CKUSDC_LEDGER_CANISTER_ID) ? [IC_CKUSDC_LEDGER_CANISTER_ID] : [])
];

// Additional suggested canisters to be enabled by default if the user set no preference
export const ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS = [
	...(nonNullish(IC_CKUSDT_LEDGER_CANISTER_ID) ? [IC_CKUSDT_LEDGER_CANISTER_ID] : [])
];
