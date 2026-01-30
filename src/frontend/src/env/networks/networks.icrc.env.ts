import {
	CK_LEDGER_CANISTER_TESTNET_IDS,
	ICRC_CK_TOKENS,
	PUBLIC_ICRC_TOKENS
} from '$env/tokens/tokens-icp/tokens.icp.ck.env';
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

export const GLDT_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA.GLDT?.ledgerCanisterId ?? '6c7su-kiaaa-aaaar-qaira-cai';

export const VCHF_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA.VCHF?.ledgerCanisterId ?? 'ly36x-wiaaa-aaaai-aqj7q-cai';

export const VEUR_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA.VEUR?.ledgerCanisterId ?? 'wu6g4-6qaaa-aaaan-qmrza-cai';

export const GHOSTNODE_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA.GHOSTNODE?.ledgerCanisterId ?? 'sx3gz-hqaaa-aaaar-qaoca-cai';

export const ICONFUCIUS_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA.ICONFUCIUS?.ledgerCanisterId ?? '5kijx-siaaa-aaaar-qaqda-cai';

export const BITCAT_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA.BITCAT?.ledgerCanisterId ?? 'xlwi6-kyaaa-aaaar-qarya-cai';

export const FORSETISCN_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA?.FORSETISCN?.ledgerCanisterId ?? 'tta5j-yqaaa-aaaar-qarbq-cai';

const TICRC1_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA?.TICRC1?.ledgerCanisterId ?? '3jkp5-oyaaa-aaaaj-azwqa-cai';

const ADDITIONAL_ICRC_TOKENS: IcInterface[] = Object.values(
	ADDITIONAL_ICRC_PRODUCTION_DATA ?? {}
).filter(nonNullish);

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
