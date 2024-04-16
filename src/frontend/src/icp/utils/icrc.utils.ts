import { ICP_NETWORK } from '$env/networks.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcFee, IcInterface, IcTokenWithoutId } from '$icp/types/ic';
import type { TokenCategory, TokenMetadata } from '$lib/types/token';
import { IcrcMetadataResponseEntries, type IcrcTokenMetadataResponse } from '@dfinity/ledger-icrc';
import { isNullish } from '@dfinity/utils';

export type IcrcLoadData = IcInterface & {
	metadata: IcrcTokenMetadataResponse;
	category: TokenCategory;
	icons?: Record<LedgerCanisterIdText, string>;
};

export const mapIcrcToken = ({
	metadata,
	icons,
	ledgerCanisterId,
	...rest
}: IcrcLoadData): IcTokenWithoutId | undefined => {
	const token = mapOptionalToken(metadata);

	if (isNullish(token)) {
		return undefined;
	}

	const { symbol, icon, ...metadataToken } = token;

	return {
		network: ICP_NETWORK,
		standard: 'icrc',
		symbol,
		icon: icons?.[ledgerCanisterId] ?? icon,
		ledgerCanisterId,
		...metadataToken,
		...rest
	};
};

type IcrcTokenMetadata = TokenMetadata & IcFee;

const mapOptionalToken = (response: IcrcTokenMetadataResponse): IcrcTokenMetadata | undefined => {
	const nullishToken: Partial<IcrcTokenMetadata> = response.reduce((acc, [key, value]) => {
		switch (key) {
			case IcrcMetadataResponseEntries.SYMBOL:
				acc = { ...acc, ...('Text' in value && { symbol: value.Text }) };
				break;
			case IcrcMetadataResponseEntries.NAME:
				acc = { ...acc, ...('Text' in value && { name: value.Text }) };
				break;
			case IcrcMetadataResponseEntries.FEE:
				acc = { ...acc, ...('Nat' in value && { fee: value.Nat }) };
				break;
			case IcrcMetadataResponseEntries.DECIMALS:
				acc = {
					...acc,
					...('Nat' in value && { decimals: Number(value.Nat) })
				};
				break;
			case IcrcMetadataResponseEntries.LOGO:
				acc = { ...acc, ...('Text' in value && { icon: value.Text }) };
		}

		return acc;
	}, {});

	if (
		isNullish(nullishToken.symbol) ||
		isNullish(nullishToken.name) ||
		isNullish(nullishToken.fee) ||
		isNullish(nullishToken.decimals)
	) {
		return undefined;
	}

	return nullishToken as IcrcTokenMetadata;
};
