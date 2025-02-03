import type { CustomToken, IcrcToken } from '$declarations/backend/backend.did';
import type { IcrcSaveCustomToken, SaveCustomTokenWithKey } from '$lib/types/custom-token';
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

export const toCustomToken = ({
	enabled,
	version,
	...rest
}: SaveCustomTokenWithKey): CustomToken => ({
	enabled,
	version: toNullable(version),
	token: { Icrc: toIcrcCustomToken(rest as IcrcSaveCustomToken) }
});
