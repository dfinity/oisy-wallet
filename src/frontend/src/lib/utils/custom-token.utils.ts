import type {
	CustomToken,
	ErcToken,
	IcrcToken,
	SplToken,
	Token
} from '$declarations/backend/backend.did';
import type { ContractAddress } from '$eth/types/address';
import type { EthereumChainId } from '$eth/types/network';
import type {
	ErcSaveCustomToken,
	IcrcSaveCustomToken,
	SaveCustomTokenWithKey,
	SplSaveCustomToken
} from '$lib/types/custom-token';
import type { TokenId, TokenMetadata } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import type { SolanaChainId } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
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

const toErcCustomToken = ({
	address: token_address,
	chainId: chain_id
}: ErcSaveCustomToken): ErcToken => ({
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
			return { Erc20: toErcCustomToken(rest) };
		}

		if (networkKey === 'Erc721') {
			return { Erc721: toErcCustomToken(rest) };
		}

		if (networkKey === 'Erc1155') {
			return { Erc1155: toErcCustomToken(rest) };
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

export const parseCustomTokenId = ({
	identifier,
	chainId
}:
	| {
			identifier: ContractAddress['address'] | TokenMetadata['symbol'];
			chainId: EthereumChainId;
	  }
	| {
			identifier: SplTokenAddress | TokenMetadata['symbol'];
			chainId: SolanaChainId['chainId'];
	  }): TokenId => parseTokenId(`custom-token#${identifier}#${chainId}`);
