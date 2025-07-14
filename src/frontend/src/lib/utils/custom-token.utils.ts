import type {
	CustomToken,
	Erc20Token,
	Erc721Token,
	IcrcToken,
	SplToken,
	Token
} from '$declarations/backend/backend.did';
import type {
	Erc20SaveCustomToken,
	Erc721SaveCustomToken,
	IcrcSaveCustomToken,
	SaveCustomTokenWithKey,
	SplSaveCustomToken
} from '$lib/types/custom-token';
import { Principal } from '@dfinity/principal';
import { nonNullish, toNullable } from '@dfinity/utils';

const toIcrcCustomToken = ({
	ledgerCanisterId,
	indexCanisterId
}: IcrcSaveCustomToken): IcrcToken => ({
	ledger_id: Principal.fromText(ledgerCanisterId),
	index_id: toNullable(
		nonNullish(indexCanisterId) ? Principal.fromText(indexCanisterId) : undefined
	)
});

const toErc20CustomToken = ({
	address: token_address,
	chainId: chain_id,
	decimals,
	symbol
}: Erc20SaveCustomToken): Erc20Token => ({
	token_address,
	chain_id,
	decimals: toNullable(decimals),
	symbol: toNullable(symbol)
});

const toErc721CustomToken = ({
	address: token_address,
	chainId: chain_id
}: Erc721SaveCustomToken): Erc721Token => ({
	token_address,
	chain_id
});

const toSplCustomToken = ({
	address: token_address,
	decimals,
	symbol
}: SplSaveCustomToken): SplToken => ({
	token_address,
	decimals: toNullable(decimals),
	symbol: toNullable(symbol)
});

export const toCustomToken = ({
	enabled,
	version,
	...rest
}: SaveCustomTokenWithKey): CustomToken => {
	const toCustomTokenMap = (): Token => {
		const { networkKey } = rest;

		if (networkKey === 'Icrc') {
			return { Icrc: toIcrcCustomToken(rest) };
		}

		if (networkKey === 'Erc20') {
			return { Erc20: toErc20CustomToken(rest) };
		}

		if (networkKey === 'Erc721') {
			return { Erc721: toErc721CustomToken(rest) };
		}

		if (networkKey === 'SplMainnet') {
			return { SplMainnet: toSplCustomToken(rest) };
		}

		if (networkKey === 'SplDevnet') {
			return { SplDevnet: toSplCustomToken(rest) };
		}

		// Force compiler error on unhandled cases based on leftover types
		const _: never = networkKey;

		throw new Error(`Unsupported network key: ${networkKey}`);
	};

	return {
		enabled,
		version: toNullable(version),
		token: toCustomTokenMap()
	};
};
