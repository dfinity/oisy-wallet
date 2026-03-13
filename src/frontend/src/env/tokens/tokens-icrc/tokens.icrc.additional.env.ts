import { additionalIcrcTokens } from '$env/tokens/tokens.icrc.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcInterface } from '$icp/types/ic-token';
import { mapIcrcData } from '$icp/utils/map-icrc-data';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	IcrcMetadataResponseEntries,
	type IcrcTokenMetadataResponse
} from '@icp-sdk/canisters/ledger/icrc';

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

export const ADDITIONAL_ICRC_TOKENS_METADATA: Map<LedgerCanisterIdText, IcrcTokenMetadataResponse> =
	new Map(
		Object.values(additionalIcrcTokens)
			.filter(nonNullish)
			.reduce<[LedgerCanisterIdText, IcrcTokenMetadataResponse][]>((acc, token) => {
				const { ledgerCanisterId, name, symbol, fee, decimals } = token;

				if (isNullish(name) || isNullish(symbol) || isNullish(fee) || isNullish(decimals)) {
					return acc;
				}

				acc.push([
					ledgerCanisterId,
					[
						[IcrcMetadataResponseEntries.SYMBOL, { Text: symbol }],
						[IcrcMetadataResponseEntries.NAME, { Text: name }],
						[IcrcMetadataResponseEntries.FEE, { Nat: fee }],
						[IcrcMetadataResponseEntries.DECIMALS, { Nat: BigInt(decimals) }],
						[IcrcMetadataResponseEntries.LOGO, { Text: `/icons/icrc/${ledgerCanisterId}.png` }]
					]
				]);

				return acc;
			}, [])
	);
