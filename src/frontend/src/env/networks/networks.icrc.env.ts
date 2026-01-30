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
  import {CK_LEDGER_CANISTER_TESTNET_IDS,
	ICRC_CK_TOKENS,
	PUBLIC_ICRC_TOKENS
} from '$env/tokens/tokens-icp/tokens.icp.ck.env';
import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcInterface } from '$icp/types/ic-token';
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

/**
 * All ICRC tokens data
 */

export const ICRC_TOKENS: IcInterface[] = [
	...PUBLIC_ICRC_TOKENS,
	...ADDITIONAL_ICRC_TOKENS,
	...ICRC_CK_TOKENS
];

export const ICRC_LEDGER_CANISTER_TESTNET_IDS = [
	...CK_LEDGER_CANISTER_TESTNET_IDS,
	TICRC1_LEDGER_CANISTER_ID
];
