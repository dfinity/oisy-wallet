import { ICP_NETWORK } from '$env/networks.env';
import type { IcFee, IcInterface, IcTokenWithoutId } from '$icp/types/ic';
import type { TokenMetadata } from '$lib/types/token';
import { IcrcMetadataResponseEntries, type IcrcTokenMetadataResponse } from '@dfinity/ledger-icrc';
import { isNullish } from '@dfinity/utils';

export type IcrcLoadData = IcInterface & { metadata: IcrcTokenMetadataResponse };

export const mapIcrcToken = ({ metadata, ...rest }: IcrcLoadData): IcTokenWithoutId | undefined => {
	const token = mapOptionalToken(metadata);

	if (isNullish(token)) {
		return undefined;
	}

	const { symbol, ...metadataToken } = token;

	return {
		network: ICP_NETWORK,
		standard: 'icrc',
		category: 'default',
		symbol,
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
