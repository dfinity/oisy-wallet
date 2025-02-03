import type { CustomToken, IcrcToken, SplToken } from '$declarations/backend/backend.did';
import type {
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
	networkKey,
	...rest
}: SaveCustomTokenWithKey): CustomToken => ({
	enabled,
	version: toNullable(version),
	token:
		networkKey === 'Icrc'
			? { Icrc: toIcrcCustomToken(rest as IcrcSaveCustomToken) }
			: networkKey === 'SplMainnet'
				? { SplMainnet: toSplCustomToken(rest as SplSaveCustomToken) }
				: { SplDevnet: toSplCustomToken(rest as SplSaveCustomToken) }
});
