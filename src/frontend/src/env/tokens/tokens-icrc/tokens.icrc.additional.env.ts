import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcInterface } from '$icp/types/ic-token';
import { mapIcrcData } from '$icp/utils/map-icrc-data';
import { nonNullish } from '@dfinity/utils';

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

export const TICRC1_LEDGER_CANISTER_ID: LedgerCanisterIdText =
	ADDITIONAL_ICRC_PRODUCTION_DATA?.TICRC1?.ledgerCanisterId ?? '3jkp5-oyaaa-aaaaj-azwqa-cai';

export const ADDITIONAL_ICRC_TOKENS: IcInterface[] = Object.values(
	ADDITIONAL_ICRC_PRODUCTION_DATA ?? {}
).filter(nonNullish);
