import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcTokenWithoutId } from '$icp/types/ic-token';
import type { CanisterIdText } from '$lib/types/canister';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	IcrcMetadataResponseEntries,
	type IcrcLedgerDid,
	type IcrcTokenMetadataResponse
} from '@icp-sdk/canisters/ledger/icrc';

export const buildIcrcMetadataResponse = ({
	name,
	symbol,
	fee,
	decimals
}: {
	name: string;
	symbol: string;
	fee: bigint;
	decimals: number;
}): IcrcTokenMetadataResponse => [
	[IcrcMetadataResponseEntries.SYMBOL, { Text: symbol }],
	[IcrcMetadataResponseEntries.NAME, { Text: name }],
	[IcrcMetadataResponseEntries.FEE, { Nat: fee }],
	[IcrcMetadataResponseEntries.DECIMALS, { Nat: BigInt(decimals) }]
];

export const buildIcrcTokensMetadataEntries = (
	tokens: {
		ledgerCanisterId: string;
		name?: string;
		symbol?: string;
		fee?: bigint;
		decimals?: number;
		icon?: string;
	}[]
): [LedgerCanisterIdText, IcrcTokenMetadataResponse][] =>
	tokens.reduce<[LedgerCanisterIdText, IcrcTokenMetadataResponse][]>((acc, token) => {
		const { ledgerCanisterId, name, symbol, fee, decimals, icon } = token;

		if (isNullish(name) || isNullish(symbol) || isNullish(fee) || isNullish(decimals)) {
			return acc;
		}

		acc.push([
			ledgerCanisterId,
			[
				...buildIcrcMetadataResponse({ name, symbol, fee, decimals }),
				...(nonNullish(icon)
					? ([[IcrcMetadataResponseEntries.LOGO, { Text: icon }]] as IcrcTokenMetadataResponse)
					: [])
			]
		]);

		return acc;
	}, []);

export const buildIcrcCustomTokenMetadataPseudoResponse = ({
	icrcCustomTokens,
	ledgerCanisterId
}: {
	ledgerCanisterId: CanisterIdText;
	icrcCustomTokens: Record<LedgerCanisterIdText, IcTokenWithoutId>;
}): IcrcTokenMetadataResponse | undefined => {
	const token = icrcCustomTokens[ledgerCanisterId];

	if (isNullish(token)) {
		return undefined;
	}

	const { symbol, icon: tokenIcon, name, fee, decimals } = token;

	const icon: [IcrcMetadataResponseEntries.LOGO, IcrcLedgerDid.Value] | undefined = nonNullish(
		tokenIcon
	)
		? [IcrcMetadataResponseEntries.LOGO, { Text: tokenIcon }]
		: undefined;

	return [
		...buildIcrcMetadataResponse({ name, symbol, fee, decimals }),
		...(nonNullish(icon) ? [icon] : [])
	];
};
